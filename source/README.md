# Gud / 视觉研究与学习档案 · VOL.11

站点：<https://gud455.github.io/>。Jekyll 博客，仓库 `gud455/gud455.github.io` 的 `master` 分支，从 `source/` 构建。

沿用瑞士网格、像素抖动、生成式封面与档案编辑设计。科研记录与“学习课程”使用独立集合；课程不混入科研搜索和科研订阅。

## 当前内容

- 13 篇公开科研记录；历史记录保留兼容地址。
- SDADP v0.2 阶段结果、可靠度门控、适配器交叉评价及相关复现记录，实测图表与 CSV 来源保持原有内容。
- CS231n Lecture 2–9，共 8 讲：图像分类、损失与优化、神经网络与反传、CNN、架构与训练、RNN/LSTM、Attention/Transformer、检测/分割/可视化。
- 每讲包含精简学习回顾、数学交互、无脚本静态回退、正文目录与阅读进度。
- Lecture 9 新增同场景的四种视觉任务输出对照，以及 CAM/Grad-CAM 实验；另简要回顾 FCN/U-Net、R-CNN 系列、RPN、DETR、Mask R-CNN 和 RoI Align。

所有课程演示均用于解释具体数学机制；没有把手工参数或合成样本当作训练结果。课程的“已整理”也不代表整门课程或作业完成。

## 维护入口

| 文件 | 内容 |
| --- | --- |
| `_courses/` | 课程记录与 front matter |
| `_pages/courses.html`、`_pages/cs231n.html` | 学习课程入口、CS231n 目录 |
| `_includes/home-courses.html` | 首页最新讲次 |
| `_layouts/course.html` | 课程文章、目录与阅读进度 |
| `_layouts/academic.html` | 全局导航、版次、按需资源加载 |
| `_includes/vision-task-lab.html` | 分类、检测、语义与实例分割输出对照 |
| `_includes/activation-map-lab.html` | CAM/Grad-CAM、读出结构与梯度对照 |
| `assets/courses/lecture9.js` | 合成标注、纯数学函数、SVG、交互挂载 |
| `assets/courses/vision-tasks-static.svg`、`activation-map-static.svg` | Lecture 9 无脚本回退图 |
| `assets/courses/courses.css` | 课程公共样式与响应式排版 |
| `tests/lecture9.cjs` | 可见标注、框边界、CAM、梯度差分和事件检查 |
| `scripts/check_site.py` | 输出链接、锚点、索引范围、课程资源检查 |
| `_records/`、`_data/experiments.json` | 科研正文与实测图表数据 |
| `assets/academic/notebook.js` | 科研图表、DDPM 和阅读导航 |

## 本地构建与检查

在 `source/` 内运行：

```bash
bundle install
bundle exec jekyll build
python3 scripts/check_site.py _site
node tests/site-interactions.cjs
node tests/field.cjs
node tests/notebook.cjs
node tests/courses.cjs
node tests/lecture3.cjs
node tests/lecture4.cjs
node tests/lecture5.cjs
node tests/lecture6.cjs
node tests/lecture7.cjs
node tests/lecture8.cjs
node tests/lecture9.cjs
```

本次已执行全部 11 组 Node 检查，涵盖课程数学关系与实际事件处理，以及旧科研和页面组件回归。另检查 45 个离线 HTML 页面的内部链接、锚点、课程和科研索引范围，并渲染检查新 SVG。

当前环境没有重跑完整 Jekyll 生产构建，也未进行浏览器页面视觉验收。包内 `preview/` 复用既有真实构建页面，使用 `tools/preview_courses.py` 装配新课程、导航及资源；它是离线预览，不是本次完整 Jekyll 构建结果。修改后可在包根目录运行 `python3 tools/preview_courses.py`（需要 PyYAML）。正式构建以上传后的 GitHub Actions 结果为准。

## 添加下一讲

在 `_courses/` 新建 HTML，指定 `layout: course`、`course: cs231n`、数字 `lecture`、`title`、`summary`、`status`、`updated`、`permalink`、`tags` 和 `course_styles: true`。目录自动按 lecture 排序。

新交互应有静态回退、可键盘操作的原生控件和数值依据。Lecture 9 使用 `vision_labs: true`，只在本讲加载 `lecture9.js`。后续采用新标记时，同步更新全局布局、离线预览脚本与站点检查脚本的对应分支。

更新首页最新讲次、课程范围、前后讲次链接及资源缓存版本；回退 SVG 从对应的纯函数生成，与测试同步。

## 上传

完整包中的 `上传更新说明.md` 给出两批网页上传方法。两批内的 `source/` 合并覆盖仓库根目录的 `source/`；路径应为 `source/_courses/…` 等。`preview/`、`tools/` 和包根目录说明不必上传。当前更新包尚未提交线上。

原仓库基于 sighingnow/jekyll-gitbook，保留 Apache-2.0 LICENSE。
