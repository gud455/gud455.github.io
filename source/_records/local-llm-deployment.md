---
title: "本地大模型实践：从 DeepSeek-R1 到模型服务"
summary: "记录 Ollama 部署 DeepSeek-R1 8B 的初次实践，以及模型权重、API、离线推理和部署框架之间的关系。"
section: "projects"
kind: "部署实践与工具学习"
status: "本地部署已完成 / 服务框架学习中"
period: "2026.10.18–10.23"
order: 24
featured: false
tags: ["本地部署", "大模型", "工具学习", "Hugging Face"]
nav_section: "projects"
updated: "2026-10-23"
back_url: "/projects/"
back_label: "复现实践"
---

## 第一次本地部署记录

最近使用 Ollama 完成了 `deepseek-r1:8b` 的本地部署，练习了模型下载、启动对话、查看运行状态与关闭。此次使用的是 DeepSeek-R1 系列的 8B 蒸馏模型。

| 当时的运行记录 | 配置 / 观察 |
| --- | --- |
| 系统与显卡 | Windows 11，RTX 4060 Laptop 8GB |
| 模型标签 | deepseek-r1:8b |
| 运行工具 | Ollama |
| 上下文设置 | 4096 |
| 运行状态 | Ollama 显示 100% GPU |
| 当时观测到的显存 | 约 6567 / 8188 MiB，包含当时的运行环境占用 |

这是一条环境与使用记录。尚未进行吞吐、首 token 延迟和长上下文的系统基准测试，数值也不代表所有版本与配置下的固定需求。

## 模型、API 和联网之间的关系

**模型权重**是本地推理需要加载的参数。**推理程序**负责分词、执行模型、维护上下文和生成输出。**API**提供调用推理程序的接口，可以指向本机，也可以指向远程服务。

因此，本地模型完成下载并准备好运行依赖后，可以在本机推理，无需通过云端 API Key 调用。联网检索则需要额外的检索工具和网络请求，不能仅从模型名称判断是否启用了检索。

Ollama 的本地服务可以通过 `http://127.0.0.1:11434/api/chat` 被程序调用。后续应用可以保留相近的调用层，分别配置本地服务和云端服务，并记录各自的模型与生成参数。

## 最近补充理解的工具分工

| 工具 / 平台 | 当前理解与进度 |
| --- | --- |
| Ollama | 已用于下载和运行本地模型 |
| Hugging Face Hub | 学习模型、数据集、配置与版本的组织方式 |
| Transformers | 学习模型加载、processor/tokenizer 与 generate 流程 |
| PEFT | 结合 LoRA 理解参数高效微调 |
| vLLM、SGLang | 正在了解推理服务与批处理；尚未完成独立部署验证 |

这些工具并非必须同时使用。后续会把一个可运行的小实验中的输入、模型版本、精度、生成参数和资源记录保存下来，逐步补齐服务部署能力。

## 下一步实践

先用程序调用本地服务，保存可重复的提示与输出，再尝试视觉语言模型的图像输入。医学图像模型的实验安排见[模型调研记录]({{ '/records/medical-forgery-model-survey/' | relative_url }})；课程基础见 [Hugging Face LLM Course]({{ '/courses/huggingface-llm/' | relative_url }})。

## 官方资料

- [Ollama 运行说明](https://docs.ollama.com/quickstart)
- [Ollama Chat API](https://docs.ollama.com/api/chat)
- [DeepSeek-R1 模型与蒸馏说明](https://github.com/deepseek-ai/DeepSeek-R1)
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/)

