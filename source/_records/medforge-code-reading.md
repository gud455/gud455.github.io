---
title: "MedForge 代码阅读：训练入口、奖励条件与评测闭环"
summary: "按数据、SFT、GSPO、奖励和评价追踪公开实现，记录参数、路径与待补齐的评测细节。"
section: "projects"
kind: "源码阅读与复现准备"
status: "源码已核查 / GPU 实验待开展"
period: "2026.10.20–10.23"
order: 22
featured: false
tags: ["MedForge", "代码阅读", "复现", "GSPO", "实验分析"]
nav_section: "projects"
updated: "2026-10-23"
back_url: "/records/medforge/"
back_label: "MedForge 专题"
---

## 这次阅读追踪哪一条路径

我把实现拆成五段：图像和对话样本怎样组织，SFT 学习什么，RL 怎样生成候选，奖励怎样评分，最终输出怎样进入评测。当前工作是公开源码核查和复现准备，尚未完成完整 GPU 推理、训练或论文成绩复测。

核查快照：[`f60505600d3de0959f4fcdc8bd1741754ed2c85f`](https://github.com/richardChenzhihui/ACL2026-MedForge/tree/f60505600d3de0959f4fcdc8bd1741754ed2c85f)，核对日期 2026-10-23。下述发现只描述该快照可见的内容。

## 文件入口与阅读问题

| 文件 / 材料 | 作用 | 我需要核对的内容 |
| --- | --- | --- |
| HF 数据清单与 dataset_mapping.json | 图像、原图、区域、解释之间的映射 | 路径、划分、同源图像的对应关系 |
| medforge_reasoner/train.sh | SFT | 底座、LoRA、视觉侧、序列预算 |
| medforge_reasoner/train_gspo.sh | RL 主入口 | 采样组、序列比率、rollout 服务 |
| medforge_reasoner/start_rollout_server.sh | 候选生成服务 | 服务模型、端口与训练版本是否一致 |
| medforge_reasoner/grpo_plugin_reward_coverage.py | 自定义奖励 | 解析条件、分类、框与覆盖项 |
| evaluation/detection_eval/eval.py | 分类与框评价 | 缺失函数、漏检处理、统计分母 |
| evaluation/explainability_llm_as_judge/ | 解释评价 | 评委、提示词、样本与评分条件 |

脚本中的本地路径与发布数据清单名称并非全部一致，运行前需要显式映射。例如脚本指向 `data/sft_train.json`、`data/grpo_train.json`；数据卡列出 `sft_train_dataset.json`、`grpo_train_10k_train.json`。应检查内容格式后配置路径。

## SFT 入口读到了什么

| 参数 | 公开脚本值 | 含义 |
| --- | --- | --- |
| model | Qwen3-VL-8B-Instruct 路径占位符 | 需要配置实际模型位置 |
| train_type / rank / alpha | lora / 128 / 256 | 低秩更新配置 |
| torch_dtype | bfloat16 | 数值精度设置 |
| freeze_vit / freeze_aligner | false / false | 允许视觉侧更新；实际参数需运行时确认 |
| max_length | 2048 | 训练长度预算，需核实框架的多模态计数方式 |
| NPROC_PER_NODE | 8 | 官方示例为多卡设置 |

我会先查看一条样本经过模板后的 token、图像路径、标签 mask 和可训练参数数量，再尝试小批量训练。这些检查能把“命令可以启动”和“监督信号正确”连接起来。[SFT 文件](https://github.com/richardChenzhihui/ACL2026-MedForge/blob/f60505600d3de0959f4fcdc8bd1741754ed2c85f/medforge_reasoner/train.sh)

## GSPO：不能只看脚本文件名

公开入口使用 `swift rlhf`、`rlhf_type=grpo`，并设置 `importance_sampling_level=sequence`、`num_generations=8`。训练设备列出 6 张卡，并连接 vLLM rollout server。完整运行还需要固定 SWIFT 版本，确认各参数与论文目标的对应。

脚本还重复指定了 `vllm_mode`（colocate / server）和 `beta`（0.001 / 0）。实际生效值取决于参数解析，正式复现前应整理为唯一明确的配置，并保留原始脚本和改动记录。[GSPO 文件](https://github.com/richardChenzhihui/ACL2026-MedForge/blob/f60505600d3de0959f4fcdc8bd1741754ed2c85f/medforge_reasoner/train_gspo.sh)

因此，单卡 A800 推理、资源受限的 LoRA SFT，以及官方完整 RL 配置，应分别安排和报告。当前尚未确认单卡复现完整 RL 的资源需求。

## 奖励阅读：先看解析，再看加分

论文把流程概括为位置、分析、判断；公开 README 的示例在位置之前还有全局 description。复现时需要核对训练数据的实际模板、框出现的位置与奖励解析规则。

奖励插件先从回答末行解析 real / deepfake，再提取结构标签与框坐标。末行表述不符合解析约定时，类别可能为 None，并被计为错误。

我的检查顺序是：

1. 输入标签能否解析，参考答案格式是否与预测一致。
2. 预测类别、框和标签分别解析成什么。
3. 分类错误、缺框、真实样本带框分别触发哪些分支。
4. Coverage 只在哪些条件下进入总奖励。
5. 日志中是否保留各分量，以便定位问题。

分类奖励的执行值为 ±4.0，而注释仍写 ±2.0。Coverage 的反例与详细规则放在[训练笔记]({{ '/records/medforge-sft-gspo/' | relative_url }})，便于对照公式与实现。

## 检测评测：目前尚未闭环的部分

所核查 `evaluation/detection_eval/eval.py` 调用了以下函数，但该文件中没有相应定义或导入：`classify_image`、`extract_bbox`、`compute_iou`、`extract_model_name`、`visualize_result`。

在此前整理的源码核查记录中，对提取的 `process_single_item` 使用合成输入检查，出现 `NameError: name 'classify_image' is not defined`。这属于脚本层面的可运行性发现，未运行模型，也不据此判断论文实验是否有效。当前更新再次核对了文件内的调用与定义。[评测源码](https://github.com/richardChenzhihui/ACL2026-MedForge/blob/f60505600d3de0959f4fcdc8bd1741754ed2c85f/evaluation/detection_eval/eval.py)

该文件还在真值为伪造、预测为真实时记录漏检，但没有把该样本以零 IoU 纳入定位均值。因此后续重测需要分别报告：

| 统计口径 | 分母与漏检处理 |
| --- | --- |
| 检出后的条件平均 IoU | 仅在指定的已检出伪造样本集合内计算，并说明无效框规则 |
| 全部伪造样本平均 IoU | 所有有定位标注的伪造样本，漏检和无有效框计零 |

当前公开代码不足以确认论文 0.31 使用哪一种完整统计口径。原始预测、解析失败、截断和无效框都应保留，避免静默丢弃难例。

## 下一次实践的最小闭环

| 步骤 | 应留下的可核查材料 |
| --- | --- |
| 固定版本 | 模型、代码、数据清单和框架版本 |
| 读取少量样本 | 覆盖真实、病灶植入和病灶移除，核对图像与标注 |
| 运行原生格式推理 | 输入提示、完整原始回答、生成预算、耗时与显存 |
| 核对解析与坐标 | 缩放前后尺寸、坐标约定、失败记录、框叠加图 |
| 分类与定位评价 | 混淆矩阵、每类召回、IoU 两种分母 |
| 解释评价 | 图像证据抽查、评委配置、评分维度与样本选择 |

先让少量样本完成这条路径，再扩展到统一评测。后续若修改奖励或冻结视觉编码器，会明确作为新的实验配置记录。

## 资料与相关记录

- [官方仓库](https://github.com/richardChenzhihui/ACL2026-MedForge)
- [发布数据与字段说明](https://huggingface.co/datasets/RichardChenZH/MedForge-90K)
- [模型权重与使用入口](https://huggingface.co/RichardChenZH/MedForge-Reasoner)
- [我的实验评价协议]({{ '/records/research-evaluation-protocol/' | relative_url }})
- [MedForge 专题首页]({{ '/records/medforge/' | relative_url }})

