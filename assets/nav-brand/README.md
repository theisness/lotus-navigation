# 莲花导航 · 导航项品牌素材（2026-06-06）

封面图（16:9, 即梦 Dreamina 生成，已裁去左上角 AI 角标）+ favicon。
对应线上 nav_portal.navitems 的 bg_image / icon 字段。部署位置：
free.ssbx.site:/var/project/lotus-nav/backend/images/

| 导航项 | 封面源文件 | 线上文件名(bg_image) |
|---|---|---|
| 油管视频 | cover-youtube.jpg | b210a851-4130-4a06-8cff-37a0339be6ce.jpg |
| 蓝鸟-识如幻化 | cover-blue-bird.jpg | f2ce88ba-0ad5-4115-9f1d-cf8af9363c17.jpg |
| 知乎-晓远 | cover-zhihu.jpg | 74e24b7e-97c0-43f3-8ea5-c3147c14c685.jpg |
| 莲花书院 | cover-academy.jpg | 5326b505-aee5-482c-8465-8203166a4216.jpg |
| 莲花注 | cover-op.jpg | 2adeaf22-af75-4674-80db-8f8ba1a72adf.jpg |
| 蓝莲花（重设计） | cover-bluelotus.jpg | 9082194e-8c02-4b86-ab91-9f1922cc143f.jpg |
| 命理网站（重设计） | cover-destiny.jpg | a4965643-f620-4c79-9704-c47b580f05b4.jpg |

favicon（莲花注）：lianhuazhu-favicon.svg（源）→ lianhuazhu-favicon.png(512²) → 线上 4b12b6f9-3fac-402d-aa2b-2dc40d423e0d.png

## 2026-08-02 新增三站（封面 + icon）

封面源 2560×1311 jpg（gpt-image-2 2k 生成，`img-openai --backend c2a`），线上投 **1600×820 webp**（q72）。
icon 为手绘 SVG → 256² 透明 PNG 白线稿，配合前端 CSS mask 主题化上色，风格对齐既有线稿 icon。

| 导航项 | 封面源 | 线上 bg_image | icon 源 | 线上 icon |
|---|---|---|---|---|
| 菩提制片人预览板 | cover-bodhi.jpg | 543e58a3-0a76-410e-a31c-09d82144752e.webp | icon-bodhi.svg/.png | 5ea83f9f-126f-47d4-a172-f9333efab916.png |
| 管理蓝莲花推送 | cover-lz-push.jpg | a5ef23b6-d4a6-480e-860b-d5f25d28cf47.webp | icon-lz-push.svg/.png | 424cfe23-65fb-4449-af8f-fe952ba90135.png |
| 莲花集福 | cover-laifu.jpg | 117f6296-5c73-40d9-b64d-db88bf3516b6.webp | icon-laifu.svg/.png | 69b71c8d-dc62-4145-871a-47bc323530de.png |
| 撷影 | cover-xieying.jpg | 36d8bab7-d19c-4cbe-a779-18a54f1aa30e.webp | icon-xieying.svg/.png | e66025d9-db65-408d-9069-1ff2b4a1865a.png |

「管理蓝莲花推送」原 icon `1da03330-aee2-4152-9669-9371162758c9.png`（齿轮+报表）已被替换，文件仍保留在服务器上。
SVG → PNG 渲染：`google-chrome --headless --default-background-color=00000000 --window-size=256,256 --screenshot=out.png in.svg`
