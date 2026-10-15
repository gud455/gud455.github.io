# Gud / 视觉研究档案 · VOL.03

站点：<https://gud455.github.io/>。

瑞士网格、像素抖动、生成式封面与档案编辑设计。当前首页、索引、搜索与订阅聚焦科研；保留历史地址的兼容性。

## 当前内容与可视化

- 主索引 13 篇科研记录，本次新增 7 篇。
- SDADP v0.2 阶段结果、可靠度门控、2×2 适配器交叉评价。
- DSPFusion 复现日志、DiffIR / DePFusion 实践回顾、阅读地图和实验协议。
- 4 组实测图表可切换条件，保留全部数值表及图表数据 CSV。
- DDPM 前向加噪演示使用已知数学公式与合成靶标，标明非模型输出。
- 正文目录、阅读进度、相关记录与移动端横向数据表。

实测值来自 2026.10.15 阶段汇总的已舍入报告数值。参考输入诊断有独立标记；没有多种子误差条，也没有补造延迟或质量指标。论文为作者原作，个人复现与模块探索分别标注状态。

## 源码位置

| 文件 | 维护内容 |
| --- | --- |
| source/index.html | 首页 |
| source/_records/ | 科研记录与历史记录 |
| source/_data/experiments.json | 实测图表数据和解释 |
| source/_data/updates.yml | 近期进展入口 |
| source/_data/profile.yml | 个人简介 |
| source/_data/papers.yml | 作者论文与官方代码 |
| source/assets/academic/site.css | 瑞士网格与基本样式 |
| source/assets/academic/notebook.css | 科研图表与阅读界面 |
| source/assets/academic/notebook.js | 图表、DDPM 演示与阅读导航 |
| source/assets/academic/field.js | 有序抖动封面 |

## 更新

在仓库根目录 master 分支上传整个 source 文件夹，覆盖同路径文件。上传列表路径应为 source/index.html、source/_records/…；沿用当前构建 source/ 的 GitHub Actions 工作流。

完整更新包内附上传说明与真实构建的离线 preview/。

## 构建与检查

在 source/ 中执行：

~~~bash
bundle install
bundle exec jekyll build
python3 scripts/check_site.py _site
node tests/site-interactions.cjs
node tests/field.cjs
node tests/notebook.cjs
~~~

已执行 Jekyll 生产构建、35 页内部链接与锚点检查、公开索引范围检查、搜索/筛选、实测图表切换、CSV 数据核对、DDPM 数学与交互检查。当前环境没有进行浏览器视觉验收。

## 添加科研记录

在 _records/ 新建 Markdown，填写 title、summary、section、kind、status、period、order、tags、updated 等 front matter。section 可选 research / papers / projects / notes。文件名决定 /records/文件名/ 地址。

- updated 是文章整理日期；实验完成日期应写入正文。
- featured: true 会进入首页近期档案。
- archived: true 保留地址，但不进入公开科研索引、搜索和订阅。
- 可复用 experiment-chart.html 与 research-diagram.html；实测图表与 CSV 同时更新。
- 已完成、进行中、只准备脚本与参考依赖诊断分别写清。

原仓库基于 sighingnow/jekyll-gitbook，保留 Apache-2.0 LICENSE。当前采用自定义 Jekyll 布局。
