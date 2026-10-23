# Gud / 视觉研究与学习档案 · VOL.16

站点：<https://gud455.github.io/>。Jekyll 博客，仓库 `gud455/gud455.github.io` 的 `master` 分支，从 `source/` 构建。

首页采用简约学术主页布局：个人简介、近期进展、代表性研究与实践、课程入口。生成式波场缩为小幅插图，默认动态播放并可暂停；遵循系统减少动态效果设置。全站导航、页脚与配色同步简化。科研记录与“学习课程”使用独立集合；课程不混入科研搜索和科研订阅。

## 当前内容

- 19 篇公开科研与学习记录；历史记录保留兼容地址。
- SDADP v0.2 阶段结果、可靠度门控、适配器交叉评价及相关复现记录，实测图表与 CSV 来源保持原有内容。
- CS231n Lecture 2–14，共 13 讲：图像分类、损失与优化、神经网络与反传、CNN、架构与训练、RNN/LSTM、Attention/Transformer、检测/分割/可视化、视频理解、分布式训练、自监督学习、生成模型（一）、生成模型（二）。
- 每讲包含精简学习回顾、数学交互、无脚本静态回退、正文目录与阅读进度。
- Lecture 14 新增 GAN 三种局部目标的损失/梯度比较，以及解析高斯 Rectified Flow 的反向 Euler 与 CFG 实验；另简要回顾潜空间生成、DiT、时间安排与蒸馏。

所有课程演示均用于解释具体数学机制；没有把手工参数或合成样本当作训练结果。课程的“已整理”也不代表整门课程或作业完成。

## 维护入口

| 文件 | 内容 |
| --- | --- |
| `_courses/` | 课程记录与 front matter |
| `_pages/courses.html`、`_pages/cs231n.html` | 学习课程入口、CS231n 目录 |
| `_includes/home-courses.html` | 首页最新讲次 |
| `_layouts/course.html` | 课程文章、目录与阅读进度 |
| `_layouts/academic.html` | 全局导航、版次、按需资源加载 |
| `_includes/gan-gradient-lab.html` | GAN 目标、logit 导数与标量示意更新 |
| `_includes/rectified-flow-lab.html` | 高斯速度场、反向 Euler 步数、CFG 与解析误差 |
| `assets/courses/lecture14.js` | 稳定标量损失、解析速度、SVG 与交互挂载 |
| `assets/courses/gan-gradient-static.svg`、`rectified-flow-static.svg` | Lecture 14 无脚本回退图 |
| `assets/courses/courses.css` | 课程公共样式与响应式排版 |
| `tests/lecture14.cjs` | 梯度差分、解析 ODE、CFG、Euler 与真实事件处理检查 |
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
node tests/lecture10.cjs
node tests/lecture11.cjs
node tests/lecture12.cjs
node tests/lecture13.cjs
node tests/lecture14.cjs
```

2026-10-16 维护已完成 Jekyll 4.3.2 源码构建及全部 16 组 Node 检查，并验证 50 个 HTML 页面的内部链接、锚点、课程资源与科研索引范围。浏览器检查覆盖 47 个正文页面，在 1440、768、390、320 px 四种宽度下共检查 188 次，没有页面横向溢出或脚本报错；另核验手机菜单、键盘关闭及无脚本导航。

2026-10-16 清理了 15 个无引用的旧 GitBook 模板，合并导航与课程图表的重复样式；封面脚本只在首页加载。手机导航采用三列网格，增大按钮点击范围；课程卡片在窄屏上下排列，并统一列表分隔线与交互反馈。原科研和课程内容保持原有链接。

## 添加下一讲

在 `_courses/` 新建 HTML，指定 `layout: course`、`course: cs231n`、数字 `lecture`、`title`、`summary`、`status`、`updated`、`permalink`、`tags` 和 `course_styles: true`。目录自动按 lecture 排序。

新交互应有静态回退、可键盘操作的原生控件和数值依据。Lecture 14 使用 `generative2_labs: true`，只在本讲加载 `lecture14.js`。后续采用新标记时，同步更新全局布局、离线预览脚本与站点检查脚本的对应分支。

更新首页最新讲次、课程范围、前后讲次链接及资源缓存版本；回退 SVG 从对应的纯函数生成，与测试同步。

## 上传

维护文件位于仓库根目录的 `source/`，路径应为 `source/_courses/…` 等。提交到 `master` 会触发 GitHub Actions 构建和 Pages 部署；根目录历史主题文件不参与此构建。

原仓库基于 sighingnow/jekyll-gitbook，保留 Apache-2.0 LICENSE。

## 2026-10-17 界面更新

首页以研究内容为主，移除大幅英文标题、版次栏、装饰编号和大幅项目封面。课程仍从独立入口访问。动态插图在离开视口或切换到后台时暂停，返回后按播放状态恢复；关闭 JavaScript 时显示静态回退图。

2026-10-17 验证：16 组 Node 交互检查通过，包含默认动态、暂停/恢复、后台切换与初始减少动态效果偏好；首页 Liquid 模板与代表性记录链接检查通过。本轮环境未提供 Ruby/Jekyll 与浏览器检查能力，尚未重新执行完整 Jekyll 构建和视觉检查。


## 2026-10-23 学习内容更新

新增 6 篇记录：MedForge 框架、SFT / GSPO、源码核查，以及医学伪造模型调研、本地 DeepSeek-R1 部署、世界模型入门。MedForge 作为专题入口，关联训练与代码两篇笔记，并附自绘框架 SVG。

首页、近期进展、论文列表、个人简介与笔记筛选已连接新内容；课程仍使用独立集合。论文成绩、源码发现、数学反例和个人实测分别说明来源与范围。

MedForge 当前进度为论文学习与代码阅读，完整 GPU 实验尚待开展。源码引用固定到 `f60505600d3de0959f4fcdc8bd1741754ed2c85f`；记录了奖励注释/执行值差异、重复训练参数、评测缺失函数和 IoU 分母问题。
