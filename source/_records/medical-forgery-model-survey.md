---
title: "医学图像与伪造解释：通用底座、领域模型和单卡评测"
summary: "整理近期多模态模型调研，按医学回答、定位、真伪取证和解释分配模型角色，准备统一的 A800 评测。"
section: "papers"
kind: "模型调研与实验设计"
status: "公开材料已调研 / 同协议实测待开展"
period: "2026.10.22–10.23"
order: 23
featured: false
tags: ["医学图像", "多模态推理", "模型调研", "MedForge", "论文阅读"]
nav_section: "papers"
updated: "2026-10-23"
back_url: "/papers/"
back_label: "论文阅读"
---

## 调研从什么问题开始

围绕医学图像、伪造检测、医学推理与解释，我最近比较了通用视觉语言模型和在通用底座上后训练的领域模型。实验约束是一张 A800，目标是建立可以实际测试的对照组。

本篇整理已核查的公开材料与实验安排。模型卡或论文中的成绩属于作者报告，当前还没有我自己的统一 GPU 测试结果。

## 先给模型分配清楚的角色

| 候选与入口 | 类型与任务 | 拟承担的实验角色 |
| --- | --- | --- |
| [Qwen3-VL-8B-Instruct](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct) | 通用视觉语言底座 | 主基线与训练起点 |
| [Qwen3.5-9B](https://huggingface.co/Qwen/Qwen3.5-9B) | 通用视觉语言模型 | 补充通用对照，记录思考模式 |
| [MedForge-Reasoner](https://huggingface.co/RichardChenZH/MedForge-Reasoner) | Qwen3-VL-8B 上的医学取证训练 | 核心医学伪造、框与解释对照 |
| [MediX-R1-8B](https://huggingface.co/MBZUAI/MediX-R1-8B) | 医学回答与推理后训练 | 观察医学能力对取证的迁移 |
| [MedMO-8B-Next](https://huggingface.co/MBZUAI/MedMO-8B-Next) | 医学视觉语言与定位 | 第二轮独立外部测试，核对划分与坐标 |
| [Veritas++ / VeritasPP](https://huggingface.co/EricTan7/VeritasPP) | 通用图像取证后训练 | 自然图像取证向医学场景的迁移 |

这些候选均有公开权重入口。完整训练数据、数据整理过程、训练配置和可直接执行的评测材料仍要分别检查。前期还阅读了 FakeVLM、AIGI-Holmes、ForgeryGPT、ForgeryVCR、Deep-VRM 等路线；当前先收敛到上表中的角色，减少重复的部署工作。

## 性能比较应该怎样组织

医学问答、医学异常定位、编辑检测和解释忠实性需要不同的指标。同名模型在不同论文中的分数，也可能受到数据划分、提示词、输出预算和评分方式影响。

| 要比较的能力 | 我准备保留的证据 |
| --- | --- |
| 分类 | Balanced Accuracy、Macro-F1、真假召回与混淆矩阵 |
| 编辑定位 | 框 IoU、漏检率、预测框面积与坐标约定 |
| 医学回答 | 数据集、问答类型、答案评分规则 |
| 解释 | 可见证据、与框的对应、评委或人工抽查设置 |
| 工程代价 | 实际显存、输入尺寸、生成长度、耗时与失败率 |

例如，[MedForge 论文](https://arxiv.org/html/2603.18577v2)中的 99.23% 分类准确率与 0.31 框 IoU 描述不同能力；它们也不能直接与医学 VQA 准确率或自然生成图像检测分数进行总榜排序。

## 单卡 A800：先明确实验条件

8B–9B 级模型逐个 BF16 推理是第一轮的工程方案。显存除模型权重外，还受到图像 token、上下文、生成缓存和 batch 影响；A800 的 40GB 与 80GB 版本也应分别记录。当前单卡可行性仍以实际运行结果为准。

我的推进顺序是小 batch 推理、保存原始输出、建立评测，然后再考虑 LoRA SFT。官方多卡 RL 启动脚本不能直接等同于单卡训练方案。资源受限时冻结视觉侧等改动需要作为独立配置说明。

## 统一评测的关键约定

1. **覆盖四种样本。** 真实健康、真实但病变明显、病灶植入、病灶移除，尤其检查“有病灶就判假”的捷径。
2. **按来源组织划分。** 原图和所有编辑版本归于同一侧；能取得患者或序列 ID 时进一步检查患者/序列重叠。
3. **保留两套提示设置。** 一套遵循模型原生格式，一套控制共同问题和预算，并记录两者差异。
4. **分别统计失败。** 解析失败、截断、无效框和加载失败都保留，报告分母。
5. **增加分布变化。** 检查未见编辑器、压缩、缩放与不同模态，观察误报和漏检。

## 当前形成的研究问题

我最想核对的是：医学知识后训练是否改善取证，定位监督是否减少不受图像支持的解释，以及通用取证知识能否跨到医学图像。先通过同协议测试定位差距，再决定需要怎样的训练或模块。

## 主要原始资料

- [Qwen3-VL 官方仓库](https://github.com/QwenLM/Qwen3-VL)
- [Qwen3.5-9B 模型卡](https://huggingface.co/Qwen/Qwen3.5-9B)
- [MedForge 论文与代码](https://github.com/richardChenzhihui/ACL2026-MedForge)
- [MediX-R1 论文](https://arxiv.org/abs/2602.23363)与[代码](https://github.com/mbzuai-oryx/MediX-R1)
- [MedMO 论文](https://arxiv.org/abs/2602.06965)与[代码](https://github.com/genmilab/MedMO)
- [Veritas++ 论文](https://arxiv.org/abs/2607.27113)与[代码](https://github.com/EricTan7/VeritasPP)

