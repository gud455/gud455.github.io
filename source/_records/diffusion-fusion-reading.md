---
title: "扩散与融合阅读地图：先验来源、条件信息与验证问题"
summary: "把近期论文阅读组织成研究问题索引，连接 DDPM、Diff-IF、DiffIR、DSPFusion 与当前模块实验。"
section: "papers"
kind: "研究阅读地图"
status: "持续阅读"
period: "2026.10"
order: 18
featured: false
tags: ["Diffusion","图像融合","论文阅读","科研笔记"]
nav_section: "papers"
updated: "2026-10-15"
back_url: "/papers/"
back_label: "论文阅读"
---
## 我怎样组织这组阅读

当前阅读围绕三个问题展开：先验中包含什么信息，退化条件怎样影响预测，以及额外生成过程是否带来确定性方法没有的价值。

这张地图记录我的阅读关注点与实践状态。作者的方法主张与我的实验结果分别保留。

| 工作 | 我的阅读关注点 | 当前记录 |
| --- | --- | --- |
| DDPM | 噪声预测目标与反向过程怎样联系 | 已完成复现，[查看笔记]({{ '/records/ddpm/' | relative_url }}) |
| CDDFuse | 如何理解融合中的互补信息 | 已完成复现，[查看记录]({{ '/records/cddfuse/' | relative_url }}) |
| Diff-IF | 融合知识先验怎样参与扩散融合 | 官方代码阅读与实践准备 |
| DiffIR | 如何把扩散用于图像恢复 | 已有复现实践，定量材料待整理 |
| DSPFusion | 退化与语义先验怎样共同服务融合 | [双卡训练与推理日志]({{ '/records/dspfusion-reproduction/' | relative_url }}) |
| CDMFusion | 数据、训练路径与评价要求 | 复现准备中 |

## 先把输入和监督分开画出来

{% include research-diagram.html kind="prior" %}

我会分别追踪训练监督与推理输入：参考图像可以帮助学习目标，却不能在可部署评价中无标记地进入预测分支。参考依赖诊断应单独保留，这一点在适配器交叉实验中尤其重要。

## 每篇论文我想核对的六件事

1. **问题**：它处理哪类输入和退化，假设是什么？
2. **信息**：先验来自训练数据、预训练模型还是任务约束？
3. **条件**：条件网络看到了什么，空间信息是否保留？
4. **目标**：恢复、生成和融合的训练目标怎样连接？
5. **代价**：网络调用次数与真实推理成本分别是多少？
6. **证据**：有没有 Direct、固定条件、独立基线和任务层面的对照？

阅读不只收集更复杂的模块。当前的负结果让我更重视“为什么需要这个模块”以及“什么结果能证明它起作用”。

## 下一步的阅读重点

围绕 SDADP v0.2，我会优先查找能解释以下现象的证据：更准确的 latent 为什么未必对融合有用；可靠度为何不等于修正可信度；以及什么情况下分布建模可以超过一次确定性预测。

这些是问题清单，尚未构成新方法的有效性结论。

## 原始资料入口

- [DDPM 论文](https://arxiv.org/abs/2006.11239)
- [Diff-IF 作者代码](https://github.com/XunpengYi/Diff-IF)
- [DiffIR 作者代码](https://github.com/Zj-BinXia/DiffIR)
- [DSPFusion 论文](https://arxiv.org/abs/2503.23355)与[作者代码](https://github.com/Linfeng-Tang/DSPFusion)

结合阅读：[我的模块设计]({{ '/records/spatial-degradation-prior/' | relative_url }}) · [阶段实验]({{ '/records/sdadp-v02-results/' | relative_url }}) · [实验协议]({{ '/records/research-evaluation-protocol/' | relative_url }})

