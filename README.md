# SHAHRIYAR TOOLS 🛠️
> Free, High-Performance, Privacy-First Online Utilities for Developers, Designers, Students & Creators.

[![Website](https://img.shields.io/badge/Website-tools.shahriyarsojibhasan.top-dc2626?style=for-the-badge&logo=google-chrome)](https://tools.shahriyarsojibhasan.top/)
[![Creator](https://img.shields.io/badge/Developer-Shahriyar%20Sojib%20Hasan-0f172a?style=for-the-badge&logo=github)](https://shahriyarsojibhasan.top/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Zero Server Uploads](https://img.shields.io/badge/Privacy-100%25%20In--Browser-10b981?style=for-the-badge&logo=shield)](https://tools.shahriyarsojibhasan.top/privacy/)

---

## 🌟 Overview

**SHAHRIYAR TOOLS** (`https://tools.shahriyarsojibhasan.top/`) is a curated collection of free web-based utilities. Engineered with modern Web APIs (HTML5 Canvas, Web Crypto API, Web Workers, and WebAssembly), every file processing task—such as image compression, image format conversion, PDF manipulation, and password generation—executes **100% client-side** inside the user's web browser.

**No server uploads. No database logging. No cookies. No subscriptions.**

---

## 🚀 Implemented Tools Directory

| # | Tool Name | Live URL | UI/UX & Purpose | Technical Architecture |
|---|---|---|---|---|
| 01 | **Passbook Studio** | [`/passbook/`](https://tools.shahriyarsojibhasan.top/passbook/) | Bengali customer ledger, 12 bank-grade security themes, Duplex printing | Canvas, PSD/AI vector export |
| 02 | **Reunion Poster Studio** | [`/reunionposter/`](https://tools.shahriyarsojibhasan.top/reunionposter/) | 8 layout styles, pan & zoom cropping, 4K export | Dynamic DOM Artboard, html2canvas |
| 03 | **Image Compressor** | [`/image-compressor/`](https://tools.shahriyarsojibhasan.top/image-compressor/) | Interactive before/after split slider, resolution scaling | HTML5 Canvas `toBlob()`, local memory |
| 04 | **Image Converter** | [`/image-converter/`](https://tools.shahriyarsojibhasan.top/image-converter/) | Batch format conversion (JPG, PNG, WebP, GIF, BMP) | OffscreenCanvas, FileReader API |
| 05 | **PDF Toolkit** | [`/pdf-tools/`](https://tools.shahriyarsojibhasan.top/pdf-tools/) | Merge, split page ranges, rotate, extract pages | `pdf-lib` (pure client-side) |
| 06 | **QR Code Studio** | [`/qr-code-generator/`](https://tools.shahriyarsojibhasan.top/qr-code-generator/) | URLs, Wi-Fi credentials, vCards, emails with logos | `qrcode.js`, PNG & vector SVG |
| 07 | **Word Counter** | [`/word-counter/`](https://tools.shahriyarsojibhasan.top/word-counter/) | Distraction-free text analyzer, reading time, keyword density | Real-time Regex & text analytics |
| 08 | **JSON Formatter** | [`/json-formatter/`](https://tools.shahriyarsojibhasan.top/json-formatter/) | Developer IDE theme, exact line/column syntax error detection | Native JSON parser, formatting engine |
| 09 | **Password Generator** | [`/password-generator/`](https://tools.shahriyarsojibhasan.top/password-generator/) | Security vault theme, entropy gauge, brute-force crack time | `window.crypto.getRandomValues()` |
| 10 | **Color Palette Studio** | [`/color-palette/`](https://tools.shahriyarsojibhasan.top/color-palette/) | Harmonic palettes (Spacebar roll), WCAG AA/AAA contrast checker | Color math, CSS gradient generator |
| 11 | **Unit Converter** | [`/unit-converter/`](https://tools.shahriyarsojibhasan.top/unit-converter/) | Length, Mass, Temp, Area, Volume, Speed, Storage | Reciprocal real-time math engine |
| 12 | **Age Calculator** | [`/age-calculator/`](https://tools.shahriyarsojibhasan.top/age-calculator/) | Years, months, days, live ticking seconds, birthday countdown | Chronological leap-year math |
| 13 | **Invoice Generator** | [`/invoice-generator/`](https://tools.shahriyarsojibhasan.top/invoice-generator/) | A4 sheet layout, logo upload, line items, taxes, discounts | `@media print` vector PDF export |
| 14 | **Markdown Editor** | [`/markdown-editor/`](https://tools.shahriyarsojibhasan.top/markdown-editor/) | Dual-pane synchronized editor & live preview, table builder | `marked.js`, HTML export |
| 15 | **Text Case Converter** | [`/text-case-converter/`](https://tools.shahriyarsojibhasan.top/text-case-converter/) | UPPER, lower, Title, Sentence, camelCase, snake_case | 12+ casing transformers & cleaners |
| 16 | **DuoVista PDF Studio** | [`/duovista-pdf/`](https://tools.shahriyarsojibhasan.top/duovista-pdf/) | Dual split-screen reader (Up-Down / Side-by-Side), IELTS test suite, Edge annotations | Mozilla `PDF.js`, Canvas API, Audio API |

---

## 🔒 Technical SEO & Search Engine Optimization

1. **Canonical Base**: All pages are indexed under `https://tools.shahriyarsojibhasan.top/`.
2. **Schema.org Structured Data**: Valid JSON-LD scripts embedded on every page:
   - `WebApplication` / `SoftwareApplication`
   - `BreadcrumbList`
   - `FAQPage`
   - `WebSite` & `Organization`
3. **Sitemap & Robots**:
   - `sitemap.xml`: Complete XML indexing of all 20 canonical pages.
   - `robots.txt`: Directs search crawlers to the sitemap.
4. **AI Search Optimization (AEO + GEO)**:
   - `llms.txt`: Structured metadata and platform documentation formatted specifically for AI and LLM search agents.

---

## 💻 Local Development & Quality Assurance

To preview or test locally:

```bash
# 1. Run local HTTP probe and test suite
node scripts/http_probe.js

# 2. Run automated link integrity & metadata audit
node scripts/audit_runner.js

# 3. Serve locally with Python
python -m http.server 8000
```

Open `http://localhost:8000` in your web browser.

---

## 🌐 Deployment Instructions (GitHub Pages)

The repository is configured for direct static deployment via GitHub Pages:

1. Push all files to the `main` branch.
2. In your GitHub repository settings, navigate to **Pages**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)`
3. Ensure **Custom domain** is set to `tools.shahriyarsojibhasan.top` (enforced by `CNAME`).
4. Check **Enforce HTTPS**.

---

## 👤 Developer & Maintainer

**Shahriyar Sojib Hasan**
- **Personal Portfolio**: [https://shahriyarsojibhasan.top/](https://shahriyarsojibhasan.top/)
- **Documentation Hub**: [https://tools.shahriyarsojibhasan.top/docs/](https://tools.shahriyarsojibhasan.top/docs/)
- **Email**: [hello@shahriyarsojibhasan.top](mailto:hello@shahriyarsojibhasan.top)
- **GitHub**: [@shahriyarsojibhasan](https://github.com/shahriyarsojibhasan)
- **LinkedIn**: [in/shahriyarsojibhasan](https://linkedin.com/in/shahriyarsojibhasan)
- **X (Twitter)**: [@shahriyarsojib_](https://x.com/shahriyarsojib_)

---

## 📄 License

This project is licensed under the MIT License — free for personal, educational, and commercial use.
