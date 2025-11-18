
部署方式：cloudfare pages

在 Cloudflare 控制台关联 GitHub 仓库
登录 Cloudflare 控制台，进入 Pages 页面。
点击 创建项目 → 连接到 Git，选择你的 GitHub 仓库。
选择要部署的分支（如 main）。

部署说明（关键步骤）
KV 命名空间：确保已创建 NAV_LINKS 命名空间，并在项目设置中绑定（参考之前的步骤）。

部署方式：
本地部署：wrangler pages deploy
GitHub 集成：推送代码后自动部署（需在控制台配置环境变量和 KV 绑定）

配置构建设置：
框架预设：选择 None（因为是自定义项目）。
构建命令：留空（无需构建，直接部署静态文件和 Worker）。
输出目录：留空（默认使用根目录）



关联 KV 命名空间
部署前需在项目设置中绑定 KV 命名空间：
进入项目 → 设置 → 函数 → KV 命名空间绑定 → 添加绑定。

变量名称：填写 NAV_LINKS（需与 wrangler.toml 中的 binding 一致）。

KV 命名空间：选择之前创建的 NAV_LINKS 命名空间。

开始部署点击 部署项目，Cloudflare 会自动从 GitHub 拉取代码并部署。后续每次向 GitHub 推送代码，都会触发自动部署。

