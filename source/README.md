# Gud · 科研与学习

我的个人主页与学习记录：<https://gud455.github.io/>。

内容围绕我在中国矿业大学（北京）的计算机科学与技术本科学习，以及多模态图像融合、扩散模型、退化感知先验、论文复现和课程项目。研究思考与复现记录分别标注进度。

## 源码结构

- `index.html`：个人主页；顶部导航、左侧简介、研究兴趣、近期记录和精选项目。
- `_data/profile.yml`：个人简介；没有填写的邮箱与真实姓名不会展示。
- `_data/navigation.yml`、`directions.yml`、`papers.yml`：导航、研究兴趣和原论文信息。
- `_records/*.md`：研究、复现、阅读与学习记录。
- `_pages/`：栏目入口及原有笔记。
- `_layouts/`、`_includes/academic-profile.html`：自定义 Jekyll 布局。
- `assets/academic/`：样式、交互与 SVG 站点标识。

## 新增记录

在 `_records/` 新建 Markdown 文件。文件名决定 `/records/文件名/` URL，前置字段示例如下：

```yaml
---
title: 一次真实的学习记录
summary: 本次记录的问题与收获。
section: research # research / papers / projects / notes
nav_section: research
kind: 研究思考
status: 探索中
period: '2026.10'
updated: 2026-10-14 # 本文整理或更新日期，不代表实验完成日期
order: 1
featured: false
tags: [Diffusion, 图像融合]
back_url: /research/
back_label: 研究记录
math: false
---
```

`/notes/` 汇集所有记录。搜索支持标题、关键词、状态和正文，标签与搜索取交集。筛选条件保留在 URL 中。关闭 JavaScript 后，所有导航和记录仍可阅读。

## 构建与校验

```bash
bundle install
bundle exec jekyll build
python3 scripts/check_site.py _site
node tests/site-interactions.cjs
bundle exec jekyll serve
```

GitHub Actions 对 `master` 进行 Jekyll 构建、页面/链接与交互校验，然后部署到 GitHub Pages。可回退普通 Git 提交恢复旧版。

## 旧链接

`/modeling/`、`/programming/` 及其子笔记和学习日志 URL 保留；`/ai/` 转到 `/research/`，`/others/about/` 转到首页，`/assets/search.html` 转到 `/notes/`。早期草稿只在笔记页提供入口，不作为科研成果展示。

原仓库基于 sighingnow/jekyll-gitbook，保留其 Apache-2.0 LICENSE 与历史资源；新版使用自定义 Jekyll 布局，不加载 GitBook 运行时。
