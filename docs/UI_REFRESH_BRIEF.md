# 介面美化／視覺改版 — 接續用簡報

## 專案型態

- 靜態前端：`index.html` + `styles.css` + `app.js`（無框架）
- 字體：Google Fonts `Noto Sans TC`
- 語言：繁體中文 UI；戶籍資料存 `localStorage`，可選 Supabase 同步

## 主要畫面（勿改壞路由與 id）

- 首頁 hub：`#homePage` — 多個 `goPage(...)` 按鈕
- 收藏買賣：`#tradingPage` — 側欄選項、統計、卡片網格、dialog
- Amazon：`#amazonPage`
- 打工小秘書：`#workPage` — 月曆 `.work-calendar`、區間收入、班表 dialog
- LEGO／帳密：`#legoPage`、`#vaultPage`（多為預留）

## 目前視覺方向（2026）

- 已套用 **A：柔霧淺色 + 單一靛紫主色（`#5b5ce0`）+ 大圓角 + 卡片陰影**，以 `styles.css` 的 `:root` token 為準。

## 建議改版方向（若想再迭代）

1. **設計語言**：可改深色／更高對比等，仍建議改 token 與少數元件，避免破壞結構
2. **層次**：首頁 hub 卡片／大按鈕更清楚；子頁頂部麵包屑或標題區一致
3. **元件**：按鈕、panel、stat、對話框、月曆格子 — 圓角、陰影、hover/focus 狀態統一；符合鍵盤與 `prefers-reduced-motion`
4. **打工月曆**：已有區間底色、「班」標記 — 可再強化對比與小螢幕可讀性
5. **勿更動**：`app.js` 里依賴的 element `id`、以及現有 class 若被 JS 使用需保留或一併改 JS

## 核心檔案

| 檔案 | 用途 |
|------|------|
| `index.html` | 結構與文案 |
| `styles.css` | 幾乎所有視覺（優先改這支） |
| `app.js` | 僅在需改 class 名或結構時動到 |
| `config/supabase-env.js` | 設定，通常不為 UI 而改 |

## 在新對話裡怎麼帶給 AI

1. 新聊天或 Plan 里 **@ 資料夾** `David-`，或至少 **@** `index.html`、`styles.css`
2. 貼一句話：「請依照 `docs/UI_REFRESH_BRIEF.md` 做全站 UI 美化，維持所有 `id` 與 `goPage` 可用。」

---

*此檔由使用者發起「用 UI 技術優美化頁面」時建立，可自行刪改目標描述。*
