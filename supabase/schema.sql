-- ============================================================
-- David 收藏系統 — Supabase 多裝置同步（含打工小秘書）
-- ============================================================
-- 怎麼用：
-- 1. 登入 https://supabase.com/dashboard → 選你的專案
-- 2. 左側 SQL Editor → New query
-- 3. 全選複製本檔內容 → 貼上 → Run（或 Ctrl+Enter）
-- 4. 網頁「上傳雲端」填同一專案的 Project URL、anon public key、帳本代號，儲存後再「載入／推送」
--
-- 安全提醒：此腳本允許 anon（你瀏覽器裡的金鑰）讀寫這些表，適合個人使用。
-- 請勿公開分享 anon key；若外洩，他人可讀寫同一專案資料。
-- ============================================================

-- 打工月曆：每日班表 JSON（startTime, endTime, tip, note）
create table if not exists public.work_shifts (
  owner_id text not null,
  date_key text not null,
  shift_json jsonb not null,
  primary key (owner_id, date_key)
);

-- 打工：區間收入（period_json 含 id, startDate, endDate, amount）
create table if not exists public.work_income_periods (
  owner_id text not null,
  period_id text not null,
  period_json jsonb not null,
  primary key (owner_id, period_id)
);

-- 收藏買賣
create table if not exists public.collection_items (
  owner_id text not null,
  item_id text not null,
  item_json jsonb not null,
  primary key (owner_id, item_id)
);

-- Amazon 測評
create table if not exists public.amazon_items (
  owner_id text not null,
  item_id text not null,
  item_json jsonb not null,
  primary key (owner_id, item_id)
);

-- 多裝置用 anon key 時需能讀寫（啟用 RLS 並給 anon / authenticated 規則）
alter table public.work_shifts enable row level security;
alter table public.work_income_periods enable row level security;
alter table public.collection_items enable row level security;
alter table public.amazon_items enable row level security;

drop policy if exists "work_shifts_anon_authenticated_all" on public.work_shifts;
create policy "work_shifts_anon_authenticated_all"
  on public.work_shifts
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "work_income_periods_anon_authenticated_all" on public.work_income_periods;
create policy "work_income_periods_anon_authenticated_all"
  on public.work_income_periods
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "collection_items_anon_authenticated_all" on public.collection_items;
create policy "collection_items_anon_authenticated_all"
  on public.collection_items
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "amazon_items_anon_authenticated_all" on public.amazon_items;
create policy "amazon_items_anon_authenticated_all"
  on public.amazon_items
  for all
  to anon, authenticated
  using (true)
  with check (true);
