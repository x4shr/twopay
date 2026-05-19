# TwoPay 雙人分帳 PWA

這是 React + Vite 製作的手機網頁 App 原型。

## 本機啟動

```bash
npm install
npm run dev
```

## 部署到 GitHub Pages

1. 建立 GitHub repository，例如 `twopay`。
2. 將整個專案推上 GitHub 的 `main` branch。
3. 到 Repository 的 Settings → Pages。
4. Source 選擇 GitHub Actions。
5. 到 Actions 頁面等待部署完成。

## 目前版本限制

目前資料存於瀏覽器 localStorage，因此只會保存在單一裝置。若要讓兩人共同同步，需要接 Firebase 或 Supabase。
