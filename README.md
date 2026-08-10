<div align="center">

# Mkrari Blog

一个专注阅读体验、内容归档与轻量部署的 Astro 个人博客。

[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

[在线站点](https://mkrari.cn/) · [English](./REAME-en.md) · [开始使用](#快速开始)

</div>

![Mkrari Blog 首页预览](./docs/home-preview.webp)

## 项目简介

Mkrari Blog 是基于 [Mizuki](https://github.com/LyraVoid/Mizuki) 与 [Fuwari](https://github.com/saicaca/fuwari) 定制的静态博客。项目保留了鲜明的沉浸式壁纸、响应式卡片布局和丰富的 Markdown 能力，同时将重点放在文章阅读、分类归档、站内搜索和部署效率上。

## 主要特性

- Astro 7、Svelte 5、Tailwind CSS 3 与 TypeScript
- 文章目录、分类、标签、归档和 Pagefind 本地全文搜索
- Markdown 扩展、代码高亮、KaTeX 数学公式与 Mermaid 图表
- 明暗主题、响应式布局、桌面/移动端壁纸与文章目录
- RSS / Atom、站点地图、友链、评论、点赞与分享海报
- 评论和统计均可独立关闭；Twikoo 按需加载，不阻塞首屏
- 图片延迟解码、字体子集化、CSS 压缩和静态资源缓存

## 快速开始

需要 Node.js 20+ 与 pnpm。

```bash
git clone https://github.com/Mkrari/Mkrari_blog.git
cd Mkrari_blog
pnpm install
pnpm dev
```

开发服务器默认运行在 `http://localhost:4327/`。

```bash
pnpm run check   # 类型与 Astro 检查
pnpm build       # 静态构建、Pagefind 索引和字体子集化
pnpm preview     # 本地预览生产构建
pnpm new-post    # 创建文章
```

## 内容与配置

- `src/config.ts`：站点信息、导航、个人资料、评论、统计与主题设置
- `src/content/posts/`：博客文章；推荐每篇文章使用独立目录
- `src/content/spec/`：关于页、友链页等特殊页面内容
- `src/data/friends.ts`：友链数据
- `src/data/directory-covers.ts`：文章目录封面
- `public/`：直接发布的图片、脚本和图标
- `assets/fonts-source/`：仅供构建使用的字体源文件，不会原样发布

文章示例：

```yaml
---
title: 我的第一篇文章
published: 2026-01-01
description: 一段简短摘要
image: ./cover.webp
tags: [Astro, Blog]
category: 随笔
draft: false
comment: true
---
```

统计、评论和其他第三方服务均在 `src/config.ts` 中显式启用。公开模板默认不包含任何私有站点 ID、接口地址或密钥。

## 部署

运行 `pnpm build` 后，将 `dist/` 部署到 Vercel、Netlify、Cloudflare Pages、GitHub Pages 或其他静态托管平台。部署前请修改 `siteConfig.siteURL`；Vercel 缓存规则已包含在 `vercel.json`。

## 致谢与许可

项目源自 [Mizuki](https://github.com/LyraVoid/Mizuki)，其上游为 [Fuwari](https://github.com/saicaca/fuwari)，并由 [Astro](https://github.com/withastro/astro) 驱动。请保留仓库中的 `LICENSE` 与 `LICENSE.MIT`，并遵循原项目及所用素材的授权要求。
