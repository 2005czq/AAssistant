# AAssistant

> A powerful bill splitting tool to help you and your friends settle expenses fairly.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://2005czq.github.io/AAssistant)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/2005czq/AAssistant)

## 📖 Overview

AAssistant is a bill splitter application that helps groups calculate fair cost distribution and settle debts efficiently. Originally developed as a C++ command-line tool, it has evolved into a modern, responsive web application with a beautiful handwritten notebook aesthetic.

## ✨ Features

### Web Version (Current)

- **🎨 Beautiful UI**: Handwritten notebook-style interface with light/dark themes
- **📱 Fully Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **🌍 Bilingual**: Automatic language detection (English/Chinese) with manual toggle
- **💼 Multiple Split Types**:
  - Split Equally: Distribute cost equally among all members
  - Only Selected: Include only selected members
  - Except Selected: Exclude specific members
  - By Shares: Split by ratio/percentage
  - By Amount: Specify exact amounts for each person
- **🎬 Interactive Interface**:
  - Drag-and-drop bill reordering
  - Real-time calculations
  - Visual error feedback with red circles
  - Edit mode for batch deletion
- **💾 Auto-Save**: Local storage persistence
- **📤 Export Options**:
  - Copy bill details as text
  - Download as image
- **🌓 Theme Detection**: Automatically matches system theme preference

### C++ Version

See [./cpp/README.md](./cpp/README.md) for more details.

## 🔍 Comparison

| Feature | Web Version | C++ Version |
|---------|-------------|-------------|
| Interface | Modern GUI | Command-line |
| Platform | Any browser | Compiled binary |
| Input | Interactive | Text file |
| Persistence | Auto-save | Manual |
| Export | Text/Image | Text only |
| Real-time | ✅ | ❌ |
| Mobile Support | ✅ | ❌ |
| Ratio Split | ✅ | ❌ |
| Drag Reorder | ✅ | ❌ |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

See the `LICENSE` file for details.

## 🙏 Acknowledgments

- Handwriting font: [Yozai Font](https://github.com/lxgw/yozai-font)

## 📮 Contact

For questions or suggestions, please open an issue on GitHub.

---

**Made with ❤️ by AAssistant**