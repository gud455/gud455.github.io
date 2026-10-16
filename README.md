# Gud 的视觉研究与学习档案

个人博客：<https://gud455.github.io/>。

当前站点从 `source/` 构建。根目录的 GitBook 文件是历史主题，不再被部署流程使用；维护入口、课程和科研内容请以 [source/README.md](source/README.md) 为准。

```bash
bundle install
bundle exec jekyll build --source source --config source/_config.yml --destination _site
python3 source/scripts/check_site.py _site
```

上传或修改 `source/` 后，推送到 `master` 会自动触发 GitHub Pages 构建和部署。
