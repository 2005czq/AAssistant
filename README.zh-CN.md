# AAssistant

[在线演示](https://2005czq.github.io/AAssistant) | [English](./README.md) · 简体中文 | [SKILL.md](./public/SKILL.md)

Agent 友好的在线分账工具，自动计算转账笔数最少的结算方案。

- 支持各种分账方式，每人最多转出、收款各一次。
- 自动本地保存、复制文字和 PNG 导出。

## 开发

需要 Node.js 18+ 和 pnpm 9+。

```bash
pnpm install
pnpm dev
pnpm check
pnpm fonts:split  # 生成字体分片
pnpm build
```

可将 `dist/` 部署到任意静态托管服务。本仓库使用 GitHub Actions 部署到 [GitHub Pages](https://2005czq.github.io/AAssistant)。

## 许可

[MIT](./LICENSE) · [Yozai (OFL-1.1)](./public/fonts-OFL.txt) · [Lucide (ISC)](https://lucide.dev/)
