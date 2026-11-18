# 漢法辭典

<p align="center"><img src="docs/logo.png" width="200" alt="漢法辭典"></p>

[繁體中文](README.md) · [Français](README.fr.md) · [English](README.en.md)

漢語 ⇄ 法語雙向詞典。每個法語詞附 IPA 音標，例句標註聯誦。離線優先，同一套程式碼跑在網頁、Windows、Android 三端。

**[▶ 線上使用](https://siqyin.github.io/hanfr-translate-web/)**

---

## 查詞

```
水  shuǐ
1  eau      /o/      n.f.
2  liquide  /likid/  n.m.

例句  請喝杯水，潤潤嗓子。
      Veuillez boire un verre d'eau pour vous rafraîchir.
      /vœje bwaʁ œ̃ vɛʁ do puʁ vu ʁafʁɛʃiʁ/
```

- 中文（簡體或繁體）→ 法語用詞 + 拼音 + 繁簡對照 + IPA 音標 + 詞性
- 法語 → 對應中文。變音符號可省略：`cafe` 查得到 `café`，`francais` 查得到 `français`
- 四語介面：繁體中文 / 简体中文 / Français / English
- 查詞記錄、翻譯記錄

## 音標查詢

輸入法語詞或整句，直接給出音標：

```
maison  →  /mɛzõ/

Nous sommes allés au parc hier après-midi.
→  /nu sɔmz‿alez‿o paʁk | jɛʁ apʁɛmidi./
```

收錄 125,868 個法語詞形，含 `butène`、`chrysène` 這類專業詞。

## 變體字母兼容

`œ ⇄ oe`、`æ ⇄ ae`、去變音符、大小寫全部等價：

| 輸入 | 結果 |
|---|---|
| `cœur` / `coeur` | `/kœʁ/` |
| `eleve` / `élève` | `/ɛləv/` |
| `francais` / `français` | `/fʁɑ̃sɛ/` |
| `hotel` / `hôtel` | `/ɔtɛl/` |
| `PARIS` | `/paʁi/` |

## 例句與聯誦

每個詞條附例句：中文 + 法語 + 法語整句音標。聯誦直接標在音標上，用 U+203F（undertie ‿）：

```
法語  Ceci est‿un livre.
音標  /səsi ɛst‿œ̃ livʁ/
```

三類聯誦分色標註：

| 類型 | 符號 | 例 |
|---|---|---|
| 必須 obligatoire | `‿` 綠色 | `les‿amis` |
| 可選 facultative | `‿` 黃色虛線 | `des‿étudiants` |
| 禁止 interdite | `\|` 紅色 | `les \| héros`（h aspiré） |

例句裡每個法語詞可點擊查詞。

## AI 翻譯

- 中 → 法 / 法 → 中雙向
- 使用 [Index-Translate](https://github.com/bilibili/Index-Translate) 免費公共介面
- 譯文逐詞可點，懸停即查

## 介面

- 配色：中文紅、法語藍，各四級明度
- Material You 風格：大圓角、色彩分層背景、柔和陰影、懸浮頂欄
- 三檔主題：淺色 / 深色 / 跟隨系統
- 四語介面，繁體中文與簡體中文雙向互查

## 音標體系

鼻化元音採用真實發音標法：

| 傳統標法 | 本專案標法 | 例 |
|---|---|---|
| /ɛ̃/ | **/ã/** | `pain` /pã/ |
| /œ̃/ | **/ã/** | `brun` /bʁã/ |
| /ɑ̃/ | **/ɒ̃/** | `temps` /tɒ̃/ |
| /ɔ̃/ | **/õ/** | `bon` /bõ/ |

上表可供需要傳統標法的讀者反向對照。

## 資料規模

| 項目 | 數量 |
|---|---:|
| 中文詞條 | 58,358 |
| 詞條帶例句 | 58,239（99.8%） |
| 音標詞形 | 125,868 |
| 法→中反查條目 | 49,463 |
| 聯誦標註 | 78,782 處 |

## 下載

| 平台 | 檔案 | 說明 |
|---|---|---|
| 網頁 | [siqyin.github.io/hanfr-translate-web](https://siqyin.github.io/hanfr-translate-web/) | 免安裝 |
| Windows | [HanFrDict-setup.exe](https://github.com/SiqYin/hanfr-translate/releases/latest/download/HanFrDict-setup.exe) | 安裝版 |
| Android | [HanFrDict-android.apk](https://github.com/SiqYin/hanfr-translate/releases/latest/download/HanFrDict-android.apk) | 直接安裝，需 Android 6.0+ |

三個連結固定指向最新版本。

Windows 包未做程式碼簽名，首次執行 SmartScreen 會提示「更多資訊 → 仍要執行」。
Android 用同一把正式簽名密鑰，後續版本可直接覆蓋升級。

## 技術架構

| 層 | 做法 |
|---|---|
| 前端 | 純 HTML/CSS/JS，無框架、無建置步驟 |
| 詞庫 | 單檔 JS，58,358 條 |
| 音標 | Lexique 3.83 的音素編碼經映射轉 IPA |
| 聯誦 | 確定性規則引擎，61 項測試 |
| 分詞 | 中文後向最大匹配；法語詞典最長匹配（1–4 詞） |
| 翻譯 | Index-Translate，OpenAI 相容介面 |
| 字體 | 霞鶩文楷（漢字）+ Gentium Plus（IPA，含 U+203F） |
| 桌面 | Electron 33 + electron-builder（NSIS） |
| Android | 原生 WebView 殼 + Gradle 8.7 |
| 網頁 | GitHub Pages，Actions 部署 |

## 資料來源與授權

| 來源 | 用途 | 授權 |
|---|---|---|
| [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) | 中文詞頭、拼音 | CC BY-SA 4.0 |
| [CFDICT](http://www.chine-informations.com/chinois/open/CFDICT/) | 中→法義項 | CC BY-SA 3.0 |
| [Lexique 3.83](http://www.lexique.org/) | 法語 IPA、詞性 | CC BY-SA 4.0 |
| [OpenCC](https://github.com/BYVoid/OpenCC) | 繁簡轉換 | Apache-2.0 |
| [Index-Translate](https://github.com/bilibili/Index-Translate) | 翻譯模型 | Apache-2.0 |

三份詞典資料均為 CC BY-SA：轉載或再發布需署名並以相同方式共享。
程式碼以 MIT 發布，資料不適用 MIT。

Logo 取自作者另一專案 [BewlyIris](https://github.com/SiqYin/BewlyIris) 的 `brand/` 目錄（原創自繪）。

## 本地開發

```bash
npm install

# 網頁預覽
python tools/serve.py 5200

# 重建詞庫
python tools/build_zhfr.py
python tools/build_ipa_dict.py

# 測試
node tools/test_liaison.js     # 聯誦 61 項
node tools/test_ipa_query.js   # 音標查詢 35 項
node tools/check_i18n.js       # 四語言鍵位
python tools/qa_check.py       # 品質檢查清單

# 打包
npx electron-builder --win nsis --config.directories.output=release-out
```

Android 建置：

```bash
cd android
JAVA_HOME=<jdk17> ./gradlew assembleRelease
```

> AGP 不允許專案路徑含非 ASCII 字元。若路徑有中文，請在純 ASCII 目錄建置。

## 已知限制

1. 音標缺口約 8.3%：Lexique 未收錄的專業詞、派生詞，標「待核」。
2. 例句法語未經母語者審校。
3. 部分 facultative 聯誦的判斷存在學理分歧，按主流教學語法處理。
4. 整句音標不含語調。
5. `plus` 等多音詞未按句法消歧，取 Lexique 預設讀音。

## 致謝

- [BewlyIris](https://github.com/SiqYin/BewlyIris) — Logo
- Lexique 3.83（New, Pallier et al., CNRS）
- CFDICT（Chine-Informations.com, David Houstin）
- CC-CEDICT
