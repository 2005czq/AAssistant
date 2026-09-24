# AAssistant

[Demo](https://2005czq.github.io/AAssistant) | English · [简体中文](./README.zh-CN.md) | [SKILL.md](./public/SKILL.md)

An agent-friendly online bill splitter that automatically calculates settlements with the fewest transfers.

- Supports multiple splitting methods, each person sends and receives at most once.
- Automatic local saving, text copying, and PNG export.

## Development

Requires Node.js 18+ and pnpm 9+.

```bash
pnpm install
pnpm dev
pnpm check
pnpm fonts:split  # Pre-generate font subsets
pnpm build
```

Deploy `dist/` to any static host. This repository uses GitHub Actions to deploy to [GitHub Pages](https://2005czq.github.io/AAssistant).

## License

[MIT](./LICENSE) · [Yozai (OFL-1.1)](./public/fonts-OFL.txt) · [Lucide (ISC)](https://lucide.dev/)
