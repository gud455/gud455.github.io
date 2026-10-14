---
title: DDPM 复现：从加噪到反向采样
summary: 已完成 DDPM 复现。这里整理我对噪声预测、时间步条件以及训练和采样流程的基础理解。
section: projects
kind: 论文复现
status: 已完成复现
period: 复现回顾
order: 6
featured: false
math: true
tags:
- Diffusion
- PyTorch
nav_section: projects
updated: '2026-10-14'
back_url: /projects/
back_label: 项目实践
---
## 这次复现的学习目标

我通过 DDPM 复现学习扩散模型，重点理解前向加噪、噪声预测和反向采样之间的联系，而不只是运行训练脚本。

## 我梳理的基本关系

在 DDPM 中，干净样本与某个时间步的带噪样本可以写为：

$$
x_t=\sqrt{\bar{\alpha}_t}\,x_0+\sqrt{1-\bar{\alpha}_t}\,\epsilon,
\qquad \epsilon\sim\mathcal{N}(0,I).
$$

其中，$\alpha_t=1-\beta_t$，$\bar{\alpha}_t=\prod_{s=1}^{t}\alpha_s$。时间步决定噪声程度，模型需要同时观察带噪输入与时间信息。

常见的噪声预测训练目标是：

$$
\mathcal{L}_{\mathrm{simple}}=
\mathbb{E}_{x_0,t,\epsilon}
\left[\left\|\epsilon-\epsilon_\theta(x_t,t)\right\|_2^2\right].
$$

我的理解是：训练时可以直接构造随机时间步的样本，而采样时需要从噪声出发按反向过程逐步更新。两者的流程不能混淆。

## 我重点学习的实现部分

- **时间步编码**：理解正弦位置编码如何表示不同时间步。
- **U-Net 模块**：学习残差块、上下采样与注意力的作用。
- **训练与采样**：区分噪声预测训练和反向迭代采样。
- **运行环境**：关注设备、显存、训练保存和断点恢复。

## 从复现走向研究

这次复现给了我继续理解条件扩散和扩散先验的基础。接下来我更关心：条件信息如何改变去噪过程，以及怎样把先验用于图像融合。

本站目前没有上传本次复现的原始 checkpoint、完整训练日志或定量指标。这份页面是学习过程的阶段整理。

## 原论文与作者实现

- [Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2006.11239)，Ho、Jain、Abbeel，2020。
- [作者实现](https://github.com/hojonathanho/diffusion)。
