# 漢法辭典 · 網頁版

在線使用：<https://siqyin.github.io/hanfr-translate-web/>

本倉庫是 [漢法辭典](https://github.com/SiqYin/hanfr-translate) 的網頁版建置產物，由 GitHub Actions 自動部署到 GitHub Pages。

## 內容

| 文件 | 說明 |
|---|---|
| `index.html` | 入口 |
| `zhfr.js` | 中→法詞庫（58,358 條） |
| `fr2zh.js` | 法→中反查（49,463 條） |
| `ipa.js` | 法語音標詞典（125,868 詞形） |
| `liaison.js` | 聯誦判定引擎 |
| `ipa_query.js` | 音標查詢層 |
| `app.js` / `translate.js` | 查詞與翻譯 |
| `i18n.js` | 四語界面 |

## 來源與授權

- 中文詞頭：CC-CEDICT（CC BY-SA 4.0）
- 中法義項：CFDICT（CC BY-SA 3.0）
- 法語音標：Lexique 3.83（CC BY-SA 4.0）
- 翻譯：Index-Translate（Apache-2.0）

數據均為 CC BY-SA，轉載或再發布需署名並以相同方式共享。

## 本地預覽

```bash
python -m http.server 5200
# http://localhost:5200/?q=水
```
