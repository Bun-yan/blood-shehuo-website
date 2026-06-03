# 血社火文化传承网站

这是一个用于展示血社火非遗文化、调研数据和文创产品的静态网站。本地开发时可以用 Flask 启动，公开展示时可部署到 GitHub Pages。

## 公开访问

GitHub Pages 地址通常为：

https://bun-yan.github.io/blood-shehuo-website/

如果首次访问提示 404，请到 GitHub 仓库：

`Settings` -> `Pages` -> `Build and deployment` -> `Source`

选择 `GitHub Actions`，保存后等待 Actions 部署完成。

## 本地启动

双击 `start-site.bat`，或在命令行运行：

```powershell
python app.py
```

然后打开：

http://127.0.0.1:5000/

## 说明

公开版登录注册使用浏览器本地存储，适合展示和课程/项目演示。本地 Flask 版提供 SQLite 账号注册登录接口，但不建议直接作为公网生产后端。
