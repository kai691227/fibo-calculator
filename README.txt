費波導航系統 Web App V1.1｜自動上一交易時段版

【用途】
打開 App 後，自動使用與魔法導航相同的 TAIFEX Cloudflare Worker，
讀取上一個已完成交易時段的台指期 High / Low，然後直接計算 9 層費波點位。

【正式參數】
0.336 / 0.544 / 0.6916 / 0.880

【公式】
Range = High - Low
Center = (High + Low) / 2
Upper = Center + Range × Parameter
Lower = Center - Range × Parameter

四個上層與四個下層價格四捨五入至整數。
Center 保留 .5 時顯示一位小數。

【模式】
1. 點位模式
   直接顯示上四層 + 多空中心 + 下四層，共 9 層。
2. 完整模式
   顯示 High / Low / Range / Center 與每一層公式。

【資料模式】
預設：自動
備用：手動 High / Low

【資料來源】
預設 Worker：
https://taifex-proxy.kai095919.workers.dev

【資料更新說明】
日盤資料約於交易日下午 4 時更新。
夜盤資料約於交易日上午 7 時更新。
假日顯示最近已發布交易時段資料。

【驗證樣本】
H 45246 / L 44362
Center 44804
上：45101 / 45285 / 45415 / 45582
下：44507 / 44323 / 44193 / 44026

H 44873 / L 43800
Center 44336.5
上：44697 / 44920 / 45079 / 45281
下：43976 / 43753 / 43594 / 43392

H 44494 / L 43843
Center 44168.5
上：44387 / 44523 / 44619 / 44741
下：43950 / 43814 / 43718 / 43596

【部署】
將本壓縮檔內 8 個檔案全部覆蓋到 fibo-calculator GitHub Pages repository 根目錄。
