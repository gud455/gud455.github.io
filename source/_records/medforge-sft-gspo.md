---
title: "MedForge 训练笔记：SFT、LoRA 与 Forgery-aware GSPO"
summary: "从自回归预测和交叉熵出发，理解冷启动、组内优势与序列级更新，并用 Coverage 反例检查奖励设计。"
section: "papers"
kind: "方法学习笔记"
status: "基础概念已学习 / 实现复核中"
period: "2026.10.19–10.23"
order: 21
featured: false
tags: ["MedForge", "SFT", "LoRA", "GSPO", "多模态推理"]
nav_section: "papers"
updated: "2026-10-23"
math: true
back_url: "/records/medforge/"
back_label: "MedForge 专题"
---

## 把训练概念放到同一条样本上

学习 MedForge 时，我从“一张图像、一段问题、一份目标回答”开始理解训练。目标回答包含位置、解释和真伪结论；生成模型在给定图像、问题和已生成文本时，逐个预测后续 token。

| 概念 | 在这条样本中是什么意思 |
| --- | --- |
| 输入 x | 图像与用户问题，以及约定的提示模板 |
| 输出 y | 一整段结构化回答 |
| Policy | 当前模型对各种可能回答分配的概率 |
| SFT | 学习数据中给定的示范回答 |
| Reward | 按定义好的规则给模型生成的回答打分 |
| Advantage | 这条回答相对同组候选表现如何 |

## SFT 与交叉熵：学习示范回答

设回答包含 T 个 token，常见的自回归监督目标为：

$$
\mathcal L_{\mathrm{SFT}}=-\sum_{t=1}^{T}\log p_\theta(y_t\mid x,y_{<t}).
$$

这里的 teacher forcing 表示训练时把真实前缀提供给模型，让它预测下一个目标 token。如果目标 token 的概率从 0.1 提高到 0.8，对应损失就从约 2.303 降到 0.223。实际训练中还要检查 loss mask：哪些 assistant token 参与监督，图像和用户输入如何处理，均由数据模板与训练框架决定。

交叉熵会促进示范文本的学习；示范质量、视觉信息的利用程度和任务分布仍然影响结果。它本身没有逐条计算解释所述边界、纹理或噪声证据与像素是否对应。

## LoRA 与 cold start 各自解决什么

LoRA 常把线性层的权重更新写成：

$$
W'=W+\frac{\alpha}{r}BA.
$$

若原矩阵为 d×k，则 A 为 r×k、B 为 d×r，r 远小于原始维度。它用低秩增量减少可训练参数；激活、优化器状态、视觉编码和生成缓存仍会占用显存。

在本任务中，cold start 指强化学习前先通过 SFT 建立任务表达、输出格式和初始能力。把“冷启动”“LoRA”“SFT”混为同一个操作，会看不清训练目标与参数更新策略的区别。

公开 SFT 脚本使用 LoRA rank=128、alpha=256、BF16，并设置 `freeze_vit=false` 与 `freeze_aligner=false`。因此要进一步检查训练框架实际选中了哪些可训练参数。[固定版本训练入口](https://github.com/richardChenzhihui/ACL2026-MedForge/blob/f60505600d3de0959f4fcdc8bd1741754ed2c85f/medforge_reasoner/train.sh)

## Policy、Reward、Advantage：三个不同的量

**Policy** 是模型的生成分布，可以写为 πθ(y|x)。训练更新参数以后，模型生成不同回答的概率会改变。

**Reward** 是评价器给已生成回答打的分。它来自规则、标签或其他评价过程；该分数并不自动等于临床可信度或解释忠实性。

**Advantage** 用来表示相对表现。以组内标准化为例：

$$
A_i=\frac{R_i-\operatorname{mean}(R_1,\ldots,R_G)}{\operatorname{std}(R_1,\ldots,R_G)+\varepsilon}.
$$

例如，同一输入的三个候选奖励为 1、2、3，按总体标准差计算的优势约为 −1.225、0、1.225。这个例子只演示组内比较，未运行模型。若所有回答分数相同，就没有由奖励差异产生的排序信号；实现还需处理零标准差。

## 从 GRPO 理解 GSPO

近期学习的四种后训练方法，可以先按训练信号与更新方式放到同一张表中：

| 方法 | 典型训练信号 | 本阶段记住的区别 |
| --- | --- | --- |
| DPO | 同一输入的偏好 / 非偏好回答对 | 直接优化偏好目标，标准形式无需在线 rollout 和显式奖励模型 |
| PPO | 采样回答的奖励与优势估计 | 使用裁剪代理目标限制策略更新，常见 RLHF 实现配合价值网络 |
| GRPO | 同一输入的一组回答及奖励 | 用组内相对表现构造优势，典型形式使用 token 级比率 |
| GSPO | 同一输入的一组回答及奖励 | 使用长度归一化的序列级比率与裁剪 |

原始资料：[DPO](https://arxiv.org/abs/2305.18290)、[PPO](https://arxiv.org/abs/1707.06347)、[DeepSeekMath / GRPO](https://arxiv.org/abs/2402.03300)。本轮重点是理解它们怎样连接到 MedForge，尚未分别训练对照。

GRPO 与 GSPO 都可以用同一输入的一组回答构造相对优势。这里重点比较标准形式中的重要性比率与裁剪粒度，具体变体以实现为准。

| 比较点 | GRPO 的典型形式 | GSPO |
| --- | --- | --- |
| 新旧策略比率 | 每个 token 分别计算 | 按整条序列构造长度归一化比率 |
| 裁剪粒度 | token 级 | 序列级 |
| 要阅读的实现 | token ratio、mask、loss reduction | sequence ratio、裁剪和长度处理 |

GSPO 的序列比率可写为：

$$
s_i=\exp\left[\frac{1}{|y_i|}\sum_t\left(\log\pi_\theta(y_{i,t}\mid x,y_{i,<t})-\log\pi_{\mathrm{old}}(y_{i,t}\mid x,y_{i,<t})\right)\right].
$$

它对应 token 概率比的几何平均。裁剪目标将这个比率与优势相乘，并限制更新幅度。模型仍逐 token 自回归生成；序列级优化不会把整段回答变成一次性输出。

来源：[GSPO 原论文](https://arxiv.org/abs/2507.18071)与[Qwen 官方说明](https://qwenlm.github.io/blog/gspo/)。MedForge 脚本在 `--rlhf_type grpo` 下设置了 `--importance_sampling_level sequence`；判断训练方式需要结合这组参数与所用 SWIFT 版本。[GSPO 训练入口](https://github.com/richardChenzhihui/ACL2026-MedForge/blob/f60505600d3de0959f4fcdc8bd1741754ed2c85f/medforge_reasoner/train_gspo.sh)

## Forgery-aware 奖励：实际代码鼓励什么

按已核查的公开奖励文件，总奖励由下面几项相加。条件与数值来自可执行语句，核对日期为 2026-10-23。

| 奖励项 | 实际规则 |
| --- | --- |
| 格式 | 检查 think、description、evidence、conclusion 等标签；满分 1.0 |
| 分类 | 末行类别解析成功且正确为 +4.0，否则 −4.0 |
| 框存在性 | 伪造真值缺框或真实真值带框时为 −1.0 |
| 空间覆盖 | 真值为伪造、分类正确且预测/真实框可用时，计算 sigmoid(Coverage)，系数为 0.25 |

分类项注释仍写 ±2.0，执行语句为 ±4.0。该差异说明阅读代码时需要追踪真正参与计算的值。类别解析失败会按分类错误处理，分类错误时不再计算覆盖奖励。

格式项主要检查标签是否出现；本插件没有直接逐句核实取证文字是否与图像一致。分类和定位提供了额外约束，但解释质量仍需独立评价。

来源：[奖励插件固定快照](https://github.com/richardChenzhihui/ACL2026-MedForge/blob/f60505600d3de0959f4fcdc8bd1741754ed2c85f/medforge_reasoner/grpo_plugin_reward_coverage.py)。这是代码快照中的规则，未据此确认发布权重的全部实际训练设置。

## Coverage 为什么不等于精确定位

设 P 是预测区域，G 是真实编辑区域：

$$
\operatorname{Coverage}=\frac{|P\cap G|}{|G|},\qquad
\operatorname{IoU}=\frac{|P\cap G|}{|P\cup G|}.
$$

在一张 1000×1000 的图上，令真实框为 [400,400,500,500]。下表是按公式计算的几何反例，未使用模型输出。

| 预测框 | Coverage | IoU | 代码中的空间奖励 |
| --- | ---: | ---: | ---: |
| 精确框 [400,400,500,500] | 1.00 | 1.00 | 约 0.2483 |
| 整图框 [0,0,1000,1000] | 1.00 | 0.01 | 约 0.2483 |

两者的 Coverage 相同，因为都完整覆盖了真实编辑区域。这个反例说明该奖励项没有区分两种框；实际模型是否偏向大框，还需要预测框面积统计与奖励消融验证。

后续可以对照 Coverage、IoU、预测框面积与漏检率，考察不同约束的作用。目前这些属于实验问题，尚未验证方法收益。

## 回顾时我需要能回答的问题

1. 能否追踪一条样本中哪些 token 参与 SFT loss？
2. 能否手算一组奖励的均值、标准差与优势？
3. 能否区分生成过程的 token 粒度与策略优化的比率粒度？
4. 能否找出一种奖励很高、实际任务表现仍然不好的输出？
5. 能否分别说明分类、框定位和解释评价的证据？

继续阅读：[源码与评测路径]({{ '/records/medforge-code-reading/' | relative_url }}) · [整体框架与实验阅读]({{ '/records/medforge/' | relative_url }})。

