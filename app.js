const STORAGE_KEY = "collection_items_v2";
const LEGACY_KEY = "collection_items_v1";
const CLOUD_CONFIG_KEY = "collection_cloud_config_v1";
const CLOUD_LAST_USED_KEY = "collection_cloud_last_used_v1";
const ARROW_ICON_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M6 15l6-6 6 6" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  );
const icons = {
  鞋子: "👟",
  公仔: "🧸",
  收藏品: "📦",
  "ETB": "📮",
  "Pokemon center ETB": "🎁",
  "Pokemon TCG": "🃏",
  "Pokemon Display Box ( 36 packs )": "📚",
  "Pokemon TCG Bundle": "🧩"
};
function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

const defaultItems = [
  { id: createId(), displayOrder: 1, name: "Jordan 1 Chicago", category: "鞋子", buyPrice: 9800, buyDate: "2026-03-12", source: "SNKRS", note: "首發入手", image: "", sold: false, sellPrice: null, sellDate: null },
  { id: createId(), displayOrder: 2, name: "海賊王 魯夫 GK", category: "公仔", buyPrice: 5200, buyDate: "2026-02-01", source: "蝦皮", note: "全新未拆", image: "", sold: true, sellPrice: 6800, sellDate: "2026-04-03" }
];

const itemsGrid = document.getElementById("itemsGrid");
const emptyState = document.getElementById("emptyState");
const modal = document.getElementById("detailModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const markSoldBtn = document.getElementById("markSoldBtn");
const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

const nameInput = document.getElementById("nameInput");
const categoryInput = document.getElementById("categoryInput");
const priceInput = document.getElementById("priceInput");
const qtyInput = document.getElementById("qtyInput");
const soldQtyInput = document.getElementById("soldQtyInput");
const sizeInput = document.getElementById("sizeInput");
const sizeField = sizeInput ? sizeInput.closest(".field") : null;
const cardToneInput = document.getElementById("cardToneInput");
const dateInput = document.getElementById("dateInput");
const sourceInput = document.getElementById("sourceInput");
const noteInput = document.getElementById("noteInput");
const imageInput = document.getElementById("imageInput");
const addFormSection = document.getElementById("addFormSection");
const addBtn = document.getElementById("addBtn");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const filterStatus = document.getElementById("filterStatus");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const cloudUrlInput = document.getElementById("cloudUrlInput");
const cloudKeyInput = document.getElementById("cloudKeyInput");
const cloudOwnerInput = document.getElementById("cloudOwnerInput");
const saveCloudConfigBtn = document.getElementById("saveCloudConfigBtn");
const useLastCloudBtn = document.getElementById("useLastCloudBtn");
const pullCloudBtn = document.getElementById("pullCloudBtn");
const pushCloudBtn = document.getElementById("pushCloudBtn");
const safeSyncBtn = document.getElementById("safeSyncBtn");
const cloudStatus = document.getElementById("cloudStatus");

const countValue = document.getElementById("countValue");
const holdingValue = document.getElementById("holdingValue");
const buyValue = document.getElementById("buyValue");
const sellValue = document.getElementById("sellValue");
const profitValue = document.getElementById("profitValue");

let items = [];
let selectedId = null;
let editingId = null;
let pendingImageData = "";
let isAddFormOpen = false;
let isOptionsPanelOpen = false;
let isAmzOptionsPanelOpen = false;
let cloudConfig = { url: "", key: "", owner: "" };

function formatMoney(value) { return "$" + Number(value || 0).toLocaleString("zh-TW"); }

function normalizeCategory(category) {
  if (category === "Pokemon ETB") return "ETB";
  return category || "收藏品";
}

function normalizeCardTone(tone) {
  const rawTone = String(tone || "normal");
  const valid = ["normal", "platinum", "rosegold", "gold", "silver"];
  if (valid.includes(rawTone)) return rawTone;
  if (rawTone === "gold-gloss") return "gold";
  if (rawTone === "silver-gloss") return "silver";
  return "normal";
}

function getCardToneLabel(tone) {
  if (tone === "platinum") return "白金色";
  if (tone === "rosegold") return "玫瑰金色";
  if (tone === "gold") return "金色";
  if (tone === "silver") return "銀色";
  return "一般沒有顏色";
}

function getCardToneRank(tone) {
  if (tone === "platinum") return 1;
  if (tone === "rosegold") return 2;
  if (tone === "gold") return 3;
  if (tone === "silver") return 4;
  return 5;
}

function normalizeItem(item) {
  const cardTone = normalizeCardTone(item.cardTone);
  const qty = Math.max(1, Number(item.qty || 1));
  const legacySoldQty = item.sold ? qty : 0;
  const soldQty = Math.min(qty, Math.max(0, Number(item.soldQty == null ? legacySoldQty : item.soldQty)));
  return {
    id: item.id || createId(),
    displayOrder: Number(item.displayOrder || 0),
    name: item.name || "",
    category: normalizeCategory(item.category),
    cardTone: cardTone,
    size: item.size ? String(item.size) : "",
    buyPrice: Number(item.buyPrice || 0),
    qty: qty,
    buyDate: item.buyDate || "",
    source: item.source || "",
    note: item.note || "",
    image: item.image || "",
    soldQty: soldQty,
    sold: soldQty >= qty,
    sellPrice: item.sellPrice == null ? null : Number(item.sellPrice),
    sellDate: item.sellDate || null
  };
}

function withNormalizedOrder(list) {
  const hasOrder = list.every(function(item) {
    return Number.isFinite(item.displayOrder) && item.displayOrder > 0;
  });
  const base = hasOrder ? list.slice().sort(function(a, b) { return a.displayOrder - b.displayOrder; }) : list.slice();
  return base.map(function(item, index) {
    return { ...item, displayOrder: index + 1 };
  });
}

function reindexItemOrder() {
  items = items.map(function(item, index) {
    return { ...item, displayOrder: index + 1 };
  });
}

function loadItems() {
  const rawCurrent = localStorage.getItem(STORAGE_KEY);
  const rawLegacy = localStorage.getItem(LEGACY_KEY);
  const seed = rawCurrent || rawLegacy;
  if (!seed) return withNormalizedOrder(defaultItems.map(normalizeItem));
  try {
    const parsed = JSON.parse(seed);
    if (!Array.isArray(parsed)) return withNormalizedOrder(defaultItems.map(normalizeItem));
    return withNormalizedOrder(parsed.map(normalizeItem));
  } catch {
    return withNormalizedOrder(defaultItems.map(normalizeItem));
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadCloudConfig() {
  const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
  if (!raw) return { url: "", key: "", owner: "" };
  try {
    const parsed = JSON.parse(raw);
    return {
      url: String(parsed.url || "").trim(),
      key: String(parsed.key || "").trim(),
      owner: String(parsed.owner || "").trim()
    };
  } catch {
    return { url: "", key: "", owner: "" };
  }
}

function readEnvDefaults() {
  if (typeof window === "undefined") return null;
  const e = window.__SUPABASE_ENV__;
  if (!e || typeof e !== "object") return null;
  return {
    url: String(e.SUPABASE_URL || e.supabaseUrl || "").trim().replace(/\/+$/, ""),
    key: String(e.SUPABASE_ANON_KEY || e.supabaseAnonKey || "").trim(),
    owner: String(e.SUPABASE_OWNER || e.COLLECTION_OWNER || e.collectionOwner || e.owner || "").trim()
  };
}

function persistCloudConfigSilently() {
  try {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
  } catch (_) {
    /* file:// / private mode often blocks storage — rely on config/supabase-env.js next load */
  }
}

/** When .env-derived JS omits keys, merge only gaps. */
function mergePartialEnvIntoCloudConfig() {
  const env = readEnvDefaults();
  if (!env) return;
  let changed = false;
  if (!cloudConfig.url && env.url) {
    cloudConfig.url = env.url;
    changed = true;
  }
  if (!cloudConfig.key && env.key) {
    cloudConfig.key = env.key;
    changed = true;
  }
  if (!cloudConfig.owner && env.owner) {
    cloudConfig.owner = env.owner;
    changed = true;
  }
  if (changed && isCloudReady()) {
    persistCloudConfigSilently();
  }
}

/**
 * Prefer full window.__SUPABASE_ENV__ when three fields are filled (helps file:// opens where
 * localStorage may not persist). If local cache is complete already, keep it unless ALWAYS_USE_ENV.
 */
function initCloudConfigFromEnv() {
  cloudConfig = loadCloudConfig();
  const env = readEnvDefaults();
  const envComplete = Boolean(env && env.url && env.key && env.owner);
  const savedComplete = !!(cloudConfig.url && cloudConfig.key && cloudConfig.owner);
  const rawEnv = typeof window !== "undefined" ? window.__SUPABASE_ENV__ : null;
  const alwaysEnv = Boolean(rawEnv && rawEnv.ALWAYS_USE_ENV);

  if (envComplete && (alwaysEnv || !savedComplete)) {
    cloudConfig = { url: env.url, key: env.key, owner: env.owner };
    persistCloudConfigSilently();
    return;
  }
  mergePartialEnvIntoCloudConfig();
}

function loadLastUsedCloudConfig() {
  const raw = localStorage.getItem(CLOUD_LAST_USED_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const cfg = {
      url: String(parsed.url || "").trim(),
      key: String(parsed.key || "").trim(),
      owner: String(parsed.owner || "").trim()
    };
    return (cfg.url && cfg.key && cfg.owner) ? cfg : null;
  } catch {
    return null;
  }
}

function rememberLastUsedCloudConfig() {
  if (!isCloudReady()) return;
  localStorage.setItem(CLOUD_LAST_USED_KEY, JSON.stringify(cloudConfig));
}

function applyCloudConfigToInputs(config) {
  cloudUrlInput.value = config.url;
  cloudKeyInput.value = config.key;
  cloudOwnerInput.value = config.owner;
  cloudConfig = {
    url: config.url.trim().replace(/\/+$/, ""),
    key: config.key.trim(),
    owner: config.owner.trim()
  };
}

function refreshCloudConfigFromInputs() {
  cloudConfig = {
    url: cloudUrlInput.value.trim().replace(/\/+$/, ""),
    key: cloudKeyInput.value.trim(),
    owner: cloudOwnerInput.value.trim()
  };
}

function saveCloudConfig() {
  refreshCloudConfigFromInputs();
  persistCloudConfigSilently();
  rememberLastUsedCloudConfig();
  setCloudStatus(isCloudReady() ? "雲端設定已儲存，可載入/同步。" : "雲端設定不完整。");
}

function useLastCloudConfig() {
  const last = loadLastUsedCloudConfig();
  if (!last) {
    setCloudStatus("沒有可用的上次使用設定。", true);
    return;
  }
  applyCloudConfigToInputs(last);
  persistCloudConfigSilently();
  setCloudStatus("已套用上次使用設定。");
}

function isCloudReady() {
  return Boolean(cloudConfig.url && cloudConfig.key && cloudConfig.owner);
}

function setCloudStatus(message, isError) {
  cloudStatus.textContent = message;
  cloudStatus.style.color = isError ? "#b91c1c" : "#475569";
}

async function supabaseRequest(method, path, body, extraHeaders) {
  const headers = {
    "apikey": cloudConfig.key,
    "Authorization": "Bearer " + cloudConfig.key,
    ...extraHeaders
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(cloudConfig.url + "/rest/v1/" + path, {
    method: method,
    headers: headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Supabase " + res.status + " " + text);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Supabase 回傳格式錯誤：" + error.message);
  }
}

async function upsertItemToCloud(item) {
  if (!isCloudReady()) return;
  await supabaseRequest(
    "POST",
    "collection_items?on_conflict=owner_id,item_id",
    [{ owner_id: cloudConfig.owner, item_id: item.id, item_json: item }],
    { "Prefer": "resolution=merge-duplicates,return=minimal" }
  );
}

async function deleteItemFromCloud(itemId) {
  if (!isCloudReady()) return;
  await supabaseRequest(
    "DELETE",
    "collection_items?owner_id=eq." + encodeURIComponent(cloudConfig.owner) + "&item_id=eq." + encodeURIComponent(itemId),
    undefined,
    { "Prefer": "return=minimal" }
  );
}

async function pullCloudItems(isAuto, throwOnError) {
  if (!isAuto) refreshCloudConfigFromInputs();
  if (!isCloudReady()) {
    setCloudStatus("請先填 Supabase URL / Anon Key / 帳本代號。", true);
    return;
  }
  try {
    setCloudStatus(isAuto ? "自動載入雲端資料中..." : "載入雲端資料中...");
    const rows = await supabaseRequest(
      "GET",
      "collection_items?owner_id=eq." + encodeURIComponent(cloudConfig.owner) + "&select=item_json",
      undefined
    );
    const cloudItems = Array.isArray(rows) ? rows.map(function(row) { return normalizeItem(row.item_json || {}); }) : [];
    items = withNormalizedOrder(cloudItems);
    saveItems();
    rememberLastUsedCloudConfig();
    renderItems();
    setCloudStatus((isAuto ? "已自動載入雲端資料，共 " : "已載入雲端資料，共 ") + items.length + " 筆。");
  } catch (error) {
    setCloudStatus((isAuto ? "自動載入雲端失敗：" : "載入雲端失敗：") + error.message, true);
    if (throwOnError) throw error;
  }
}

async function pushAllToCloud(isSilent) {
  if (!isSilent) refreshCloudConfigFromInputs();
  if (!isCloudReady()) {
    if (!isSilent) setCloudStatus("請先填 Supabase URL / Anon Key / 帳本代號。", true);
    return;
  }
  try {
    if (!isSilent) setCloudStatus("推送本機資料到雲端中...");
    for (const item of items) {
      await upsertItemToCloud(item);
    }
    rememberLastUsedCloudConfig();
    if (!isSilent) setCloudStatus("推送完成，共同步 " + items.length + " 筆。");
  } catch (error) {
    if (!isSilent) setCloudStatus("推送雲端失敗：" + error.message, true);
    throw error;
  }
}

async function safeSyncCloud() {
  if (!isCloudReady()) {
    setCloudStatus("請先填 Supabase URL / Anon Key / 帳本代號。", true);
    return;
  }
  try {
    setCloudStatus("安全同步中：先載入雲端，再推送本機（含 Amazon）...");
    await pullCloudItems(false, true);
    await pullAmazonFromCloud({ silent: true, throwOnError: true });
    await pushAllToCloud(true);
    await pushAllAmazonToCloud(true);
    setCloudStatus(
      "安全同步完成：收藏 " + items.length + " 筆；Amazon " + amazonItems.length + " 筆。"
    );
  } catch (error) {
    setCloudStatus("安全同步失敗：" + error.message, true);
  }
}

function calcRealizedProfit() {
  return items.filter(function(item) { return Number(item.soldQty || 0) > 0; }).reduce(function(sum, item) {
    return sum + ((Number(item.sellPrice || 0) - Number(item.buyPrice || 0)) * Number(item.soldQty || 0));
  }, 0);
}

function updateStats() {
  const totalPieces = items.reduce(function(sum, item) {
    return sum + Math.max(1, Number(item.qty || 1));
  }, 0);
  const holdingPieces = items.reduce(function(sum, item) {
    const qty = Math.max(1, Number(item.qty || 1));
    const soldQty = Math.min(qty, Math.max(0, Number(item.soldQty || 0)));
    return sum + Math.max(0, qty - soldQty);
  }, 0);
  countValue.textContent = String(totalPieces);
  holdingValue.textContent = String(holdingPieces);
  buyValue.textContent = formatMoney(items.reduce(function(sum, item) {
    return sum + (Number(item.buyPrice || 0) * Number(item.qty || 1));
  }, 0));
  sellValue.textContent = formatMoney(items.filter(function(item) { return Number(item.soldQty || 0) > 0; }).reduce(function(sum, item) {
    return sum + (Number(item.sellPrice || 0) * Number(item.soldQty || 0));
  }, 0));
  const realized = calcRealizedProfit();
  profitValue.textContent = formatMoney(realized);
  profitValue.className = "value " + (realized >= 0 ? "profit" : "loss");
}

function getFilteredItems() {
  const q = searchInput.value.trim().toLowerCase();
  const cat = filterCategory.value;
  const status = filterStatus.value;
  return items.filter(function(item) {
    const passSearch = !q || item.name.toLowerCase().includes(q) || item.source.toLowerCase().includes(q);
    const passCategory = cat === "全部" || item.category === cat;
    const soldQty = Number(item.soldQty || 0);
    const qty = Number(item.qty || 1);
    const passStatus = status === "全部"
      || (status === "持有中" && soldQty === 0)
      || (status === "已賣出" && soldQty >= qty);
    return passSearch && passCategory && passStatus;
  }).sort(function(a, b) {
    const toneDiff = getCardToneRank(a.cardTone) - getCardToneRank(b.cardTone);
    if (toneDiff !== 0) return toneDiff;
    return Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
  });
}

function renderCardImage(item) {
  if (item.image) return '<img class="thumb card-media" src="' + item.image + '" alt="' + escapeHtml(item.name) + '">';
  return '<div class="emoji card-media">' + (icons[item.category] || "📦") + "</div>";
}

function renderItems() {
  const filtered = getFilteredItems();
  itemsGrid.innerHTML = "";
  emptyState.hidden = filtered.length > 0;
  filtered.forEach(function(item) {
    const itemIndex = items.findIndex(function(x) { return x.id === item.id; });
    const qty = Number(item.qty || 1);
    const soldQty = Number(item.soldQty || 0);
    const statusText = soldQty >= qty ? "已賣出" : (soldQty > 0 ? ("部分賣出（" + soldQty + "/" + qty + "）") : "持有中");
    const card = document.createElement("article");
    card.className = "item-card";
    if (item.cardTone === "platinum") card.classList.add("tone-platinum");
    if (item.cardTone === "rosegold") card.classList.add("tone-rosegold");
    if (item.cardTone === "gold") card.classList.add("tone-gold");
    if (item.cardTone === "silver") card.classList.add("tone-silver");
    card.innerHTML =
      renderCardImage(item) +
      '<div class="item-name">' + escapeHtml(item.name) + "</div>" +
      '<div class="tag">' + item.category + "</div>" +
      (item.category === "鞋子" && item.size ? '<div class="meta">Size：' + escapeHtml(item.size) + "</div>" : "") +
      '<div class="meta">單價：' + formatMoney(item.buyPrice) + "</div>" +
      '<div class="meta">數量：' + qty + "</div>" +
      '<div class="meta">買入總額：' + formatMoney(Number(item.buyPrice || 0) * qty) + "</div>" +
      '<div class="meta">日期：' + (item.buyDate || "-") + "</div>" +
      '<div class="meta">狀態：' + statusText + "</div>" +
      '<div class="card-order-actions">' +
      '<button class="order-btn move-up-btn" title="上移" ' + (itemIndex <= 0 ? "disabled" : "") + '><img class="arrow-icon" src="' + ARROW_ICON_URL + '" alt="上移"></button>' +
      '<button class="order-btn move-down-btn" title="下移" ' + (itemIndex >= items.length - 1 ? "disabled" : "") + '><img class="arrow-icon down" src="' + ARROW_ICON_URL + '" alt="下移"></button>' +
      "</div>";
    const upBtn = card.querySelector(".move-up-btn");
    const downBtn = card.querySelector(".move-down-btn");
    const media = card.querySelector(".card-media");
    if (media) {
      media.addEventListener("click", function(event) {
        event.stopPropagation();
        beginEdit(item.id);
      });
    }
    if (upBtn) {
      upBtn.addEventListener("click", function(event) {
        event.stopPropagation();
        moveItem(item.id, -1);
      });
    }
    if (downBtn) {
      downBtn.addEventListener("click", function(event) {
        event.stopPropagation();
        moveItem(item.id, 1);
      });
    }
    card.addEventListener("click", function() { openDetail(item.id); });
    itemsGrid.appendChild(card);
  });
  updateStats();
}

async function moveItem(id, direction) {
  const index = items.findIndex(function(item) { return item.id === id; });
  if (index < 0) return;
  const target = index + direction;
  if (target < 0 || target >= items.length) return;
  const temp = items[index];
  items[index] = items[target];
  items[target] = temp;
  reindexItemOrder();
  saveItems();
  renderItems();
  if (isCloudReady()) {
    try {
      await pushAllToCloud(true);
      setCloudStatus("卡片順序已同步到雲端。");
    } catch (error) {
      setCloudStatus("卡片順序已更新，但雲端同步失敗：" + error.message, true);
    }
  }
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openDetail(id) {
  selectedId = id;
  const item = items.find(function(x) { return x.id === id; });
  if (!item) return;
  const qty = Number(item.qty || 1);
  const soldQty = Number(item.soldQty || 0);
  const remainingQty = Math.max(0, qty - soldQty);
  const buyTotal = Number(item.buyPrice || 0) * qty;
  const sellTotal = Number(item.sellPrice || 0) * soldQty;
  const profit = sellTotal - buyTotal;
  const statusText = soldQty >= qty ? "已賣出" : (soldQty > 0 ? "部分賣出" : "持有中");
  modalTitle.textContent = (icons[item.category] || "📦") + " " + item.name;
  const imageBlock = item.image ? '<img class="detail-image" src="' + item.image + '" alt="' + escapeHtml(item.name) + '">' : "";
  modalBody.innerHTML =
    imageBlock +
    '<div class="detail-row"><div class="detail-label">類別</div><div>' + item.category + "</div></div>" +
    (item.category === "鞋子" ? '<div class="detail-row"><div class="detail-label">鞋碼 size</div><div>' + escapeHtml(item.size || "-") + "</div></div>" : "") +
    '<div class="detail-row"><div class="detail-label">卡片顏色</div><div>' + getCardToneLabel(item.cardTone) + "</div></div>" +
    '<div class="detail-row"><div class="detail-label">買入單價</div><div>' + formatMoney(item.buyPrice) + "</div></div>" +
    '<div class="detail-row"><div class="detail-label">數量</div><div>' + qty + "</div></div>" +
    '<div class="detail-row"><div class="detail-label">買入總額</div><div>' + formatMoney(buyTotal) + "</div></div>" +
    '<div class="detail-row"><div class="detail-label">買入日期</div><div>' + (item.buyDate || "-") + "</div></div>" +
    '<div class="detail-row"><div class="detail-label">購買通路</div><div>' + escapeHtml(item.source || "-") + "</div></div>" +
    '<div class="detail-row"><div class="detail-label">備註</div><div>' + escapeHtml(item.note || "-") + "</div></div>" +
    '<div class="detail-row"><div class="detail-label">目前狀態</div><div>' + statusText + "</div></div>" +
    (soldQty > 0 ? '<div class="sell-info">' +
      '<div class="detail-row"><div class="detail-label">已賣出數量</div><div>' + soldQty + "</div></div>" +
      '<div class="detail-row"><div class="detail-label">剩餘數量</div><div>' + remainingQty + "</div></div>" +
      '<div class="detail-row"><div class="detail-label">賣出單價</div><div>' + formatMoney(item.sellPrice) + "</div></div>" +
      '<div class="detail-row"><div class="detail-label">賣出總額</div><div>' + formatMoney(sellTotal) + "</div></div>" +
      '<div class="detail-row"><div class="detail-label">賣出日期</div><div>' + (item.sellDate || "-") + "</div></div>" +
      '<div class="detail-row"><div class="detail-label">本筆損益</div><div class="' + (profit >= 0 ? "profit" : "loss") + '">' + formatMoney(profit) + "</div></div>" +
      "</div>" : "");
  markSoldBtn.style.display = remainingQty <= 0 ? "none" : "inline-block";
  if (typeof modal.showModal === "function") modal.showModal();
}

function resetForm() {
  nameInput.value = "";
  categoryInput.value = "鞋子";
  priceInput.value = "";
  qtyInput.value = "1";
  soldQtyInput.value = "0";
  sizeInput.value = "";
  updateSizeFieldVisibility();
  cardToneInput.value = "normal";
  dateInput.value = "";
  sourceInput.value = "";
  noteInput.value = "";
  imageInput.value = "";
  pendingImageData = "";
}

function setAddFormOpen(open) {
  isAddFormOpen = open;
  if (addFormSection) addFormSection.style.display = open ? "block" : "none";
}

function setOptionsPanelOpen(open) {
  isOptionsPanelOpen = open;
  const panel = document.getElementById("tradingOptionsPanel");
  const toggleBtn = document.getElementById("tradingOptionsToggleBtn");
  const backdrop = document.getElementById("tradingOptionsBackdrop");
  if (panel) panel.hidden = !open;
  if (toggleBtn) toggleBtn.classList.toggle("open", open);
  if (backdrop) {
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
  }
  if (!open) {
    setAccordionOpen("add", false);
    setAccordionOpen("export", false);
    setAccordionOpen("cloud", false);
  }
}

function updateDetailBackdrop() {
  const tradingBd = document.getElementById("optionsDetailBackdrop");
  const amzBd = document.getElementById("amzOptionsDetailBackdrop");
  const addEl = document.getElementById("accBodyAdd");
  const exEl = document.getElementById("accBodyExport");
  const clEl = document.getElementById("accBodyCloud");
  const amzAddEl = document.getElementById("amzAccBodyAdd");
  const amzCloudEl = document.getElementById("amzAccBodyCloud");
  const amzEditEl = document.getElementById("amzAccBodyEdit");
  const tradingAny = Boolean(
    (addEl && !addEl.hidden) ||
    (exEl && !exEl.hidden) ||
    (clEl && !clEl.hidden)
  );
  const amzAny = Boolean(
    (amzAddEl && !amzAddEl.hidden) ||
    (amzCloudEl && !amzCloudEl.hidden) ||
    (amzEditEl && !amzEditEl.hidden)
  );
  if (tradingBd) {
    tradingBd.hidden = !tradingAny;
    tradingBd.setAttribute("aria-hidden", tradingAny ? "false" : "true");
  }
  if (amzBd) {
    amzBd.hidden = !amzAny;
    amzBd.setAttribute("aria-hidden", amzAny ? "false" : "true");
  }
}

function setAccordionOpen(kind, open) {
  const ids = { add: "accBodyAdd", export: "accBodyExport", cloud: "accBodyCloud" };
  const body = document.getElementById(ids[kind]);
  if (!body) return;
  body.hidden = !open;
  const optBtn = document.querySelector('.trading-opt-btn[data-opt="' + kind + '"]');
  if (optBtn) {
    optBtn.classList.toggle("active", open);
    optBtn.setAttribute("aria-pressed", open ? "true" : "false");
  }
  if (kind === "add" && open) setAddFormOpen(true);
  if (kind === "cloud" && open) pullCloudItems(false);
  updateDetailBackdrop();
}

function closeAllOptionAccordions() {
  setAccordionOpen("add", false);
  setAccordionOpen("export", false);
  setAccordionOpen("cloud", false);
  setAmzAccordionOpen("add", false);
  setAmzAccordionOpen("cloud", false);
  const amzEditEl = document.getElementById("amzAccBodyEdit");
  if (amzEditEl) amzEditEl.hidden = true;
  updateDetailBackdrop();
}

function toggleAccordion(kind) {
  const ids = { add: "accBodyAdd", export: "accBodyExport", cloud: "accBodyCloud" };
  const body = document.getElementById(ids[kind]);
  if (!body) return;
  const isOpen = !body.hidden;
  if (!isOpen) {
    Object.keys(ids).forEach(function(k) {
      if (k !== kind) setAccordionOpen(k, false);
    });
  }
  setAccordionOpen(kind, !isOpen);
}

function setAmzOptionsPanelOpen(open) {
  isAmzOptionsPanelOpen = open;
  const panel = document.getElementById("amzOptionsPanel");
  const toggleBtn = document.getElementById("amzOptionsToggleBtn");
  if (panel) panel.hidden = !open;
  if (toggleBtn) toggleBtn.classList.toggle("open", open);
  if (!open) {
    setAmzAccordionOpen("add", false);
    setAmzAccordionOpen("cloud", false);
  }
}

function setAmzAccordionOpen(kind, open) {
  if (open) {
    const editEl = document.getElementById("amzAccBodyEdit");
    if (editEl) editEl.hidden = true;
  }
  const ids = { add: "amzAccBodyAdd", cloud: "amzAccBodyCloud" };
  const body = document.getElementById(ids[kind]);
  if (!body) return;
  body.hidden = !open;
  const optBtn = document.querySelector('.amz-opt-btn[data-amz-opt="' + kind + '"]');
  if (optBtn) {
    optBtn.classList.toggle("active", open);
    optBtn.setAttribute("aria-pressed", open ? "true" : "false");
  }
  updateDetailBackdrop();
}

function toggleAmzAccordion(kind) {
  const ids = { add: "amzAccBodyAdd", cloud: "amzAccBodyCloud" };
  const body = document.getElementById(ids[kind]);
  if (!body) return;
  const isOpen = !body.hidden;
  if (!isOpen) {
    Object.keys(ids).forEach(function(k) {
      if (k !== kind) setAmzAccordionOpen(k, false);
    });
  }
  setAmzAccordionOpen(kind, !isOpen);
}

function updateSizeFieldVisibility() {
  if (!sizeField) return;
  const isShoe = categoryInput.value === "鞋子";
  sizeField.style.display = isShoe ? "block" : "none";
  if (!isShoe) sizeInput.value = "";
}

function scrollElementToViewportCenter(element) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const targetTop = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
  window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}

function beginEdit(id) {
  const item = items.find(function(x) { return x.id === id; });
  if (!item) return;
  setOptionsPanelOpen(true);
  setAccordionOpen("add", true);
  setAddFormOpen(true);
  editingId = id;
  nameInput.value = item.name;
  categoryInput.value = item.category;
  priceInput.value = String(item.buyPrice);
  qtyInput.value = String(item.qty || 1);
  soldQtyInput.value = String(item.soldQty || 0);
  sizeInput.value = item.size || "";
  updateSizeFieldVisibility();
  cardToneInput.value = item.cardTone || "normal";
  dateInput.value = item.buyDate || "";
  sourceInput.value = item.source || "";
  noteInput.value = item.note || "";
  imageInput.value = "";
  pendingImageData = item.image || "";
  addBtn.style.display = "none";
  saveEditBtn.style.display = "inline-block";
  cancelEditBtn.style.display = "inline-block";
  if (modal.open) modal.close();
  requestAnimationFrame(function() {
    scrollElementToViewportCenter(addFormSection);
  });
}

function endEdit() {
  editingId = null;
  addBtn.style.display = "inline-block";
  saveEditBtn.style.display = "none";
  cancelEditBtn.style.display = "none";
  setAddFormOpen(false);
  resetForm();
}

function collectFormData() {
  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const cardTone = cardToneInput.value;
  const buyPrice = Number(priceInput.value);
  const qty = Number(qtyInput.value);
  const soldQty = Number(soldQtyInput.value || 0);
  const size = category === "鞋子" ? sizeInput.value.trim() : "";
  const buyDate = dateInput.value;
  const source = sourceInput.value.trim();
  const note = noteInput.value.trim();
  if (!name) { alert("請輸入品項名稱"); return null; }
  if (!Number.isFinite(buyPrice) || buyPrice <= 0) { alert("請輸入正確買入價格"); return null; }
  if (!Number.isInteger(qty) || qty <= 0) { alert("請輸入正確數量"); return null; }
  if (!Number.isInteger(soldQty) || soldQty < 0 || soldQty > qty) { alert("已賣出數量需介於 0 到總數量之間"); return null; }
  return { name: name, category: category, cardTone: cardTone, buyPrice: buyPrice, qty: qty, soldQty: soldQty, size: size, buyDate: buyDate, source: source, note: note };
}

async function addItem() {
  const data = collectFormData();
  if (!data) return;
  const newItem = {
    id: createId(),
    displayOrder: 1,
    name: data.name,
    category: data.category,
    cardTone: data.cardTone,
    size: data.size,
    buyPrice: data.buyPrice,
    qty: data.qty,
    soldQty: data.soldQty,
    buyDate: data.buyDate,
    source: data.source,
    note: data.note,
    image: pendingImageData || "",
    sold: data.soldQty >= data.qty,
    sellPrice: null,
    sellDate: null
  };
  items.unshift(newItem);
  reindexItemOrder();
  saveItems();
  try {
    await upsertItemToCloud(newItem);
    if (isCloudReady()) setCloudStatus("新增已同步到雲端。");
  } catch (error) {
    setCloudStatus("新增成功，但雲端同步失敗：" + error.message, true);
  }
  resetForm();
  setAddFormOpen(false);
  setOptionsPanelOpen(false);
  renderItems();
}

async function saveEdit() {
  if (!editingId) return;
  const idx = items.findIndex(function(x) { return x.id === editingId; });
  if (idx < 0) return;
  const data = collectFormData();
  if (!data) return;
  items[idx] = {
    ...items[idx],
    name: data.name,
    category: data.category,
    cardTone: data.cardTone,
    size: data.size,
    buyPrice: data.buyPrice,
    qty: data.qty,
    soldQty: data.soldQty,
    sold: data.soldQty >= data.qty,
    buyDate: data.buyDate,
    source: data.source,
    note: data.note,
    image: pendingImageData || ""
  };
  if (data.soldQty === 0) {
    items[idx].sellPrice = null;
    items[idx].sellDate = null;
  }
  saveItems();
  try {
    await upsertItemToCloud(items[idx]);
    if (isCloudReady()) setCloudStatus("編輯已同步到雲端。");
  } catch (error) {
    setCloudStatus("編輯成功，但雲端同步失敗：" + error.message, true);
  }
  endEdit();
  setOptionsPanelOpen(false);
  renderItems();
}

async function removeItem(id) {
  const item = items.find(function(x) { return x.id === id; });
  if (!item) return;
  const ok = confirm("確定刪除「" + item.name + "」嗎？");
  if (!ok) return;
  items = items.filter(function(x) { return x.id !== id; });
  reindexItemOrder();
  saveItems();
  try {
    await deleteItemFromCloud(id);
    if (isCloudReady()) setCloudStatus("刪除已同步到雲端。");
  } catch (error) {
    setCloudStatus("刪除成功，但雲端同步失敗：" + error.message, true);
  }
  renderItems();
  if (modal.open) modal.close();
  if (editingId === id) endEdit();
}

async function markSelectedAsSold() {
  const idx = items.findIndex(function(x) { return x.id === selectedId; });
  if (idx < 0) return;
  const item = items[idx];
  const totalQty = Number(item.qty || 1);
  const soldQty = Math.min(totalQty, Math.max(0, Number(item.soldQty || 0)));
  const remainingQty = totalQty - soldQty;
  if (remainingQty <= 0) return alert("這筆品項已全部賣出");

  const qtyText = prompt(
    '「' + item.name + '」目前剩餘 ' + remainingQty + " 件，請輸入本次賣出數量（1-" + remainingQty + "）：",
    "1"
  );
  if (qtyText === null) return;
  const sellQty = Number(qtyText);
  if (!Number.isInteger(sellQty) || sellQty <= 0 || sellQty > remainingQty) {
    return alert("賣出數量格式錯誤");
  }

  let sellPrice = Number(item.sellPrice || 0);
  let sellDate = item.sellDate || "";
  if (soldQty === 0) {
    const priceText = prompt('輸入「' + item.name + "」賣出單價：");
    if (priceText === null) return;
    sellPrice = Number(priceText);
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) return alert("賣出價格格式錯誤");
    sellDate = prompt("輸入賣出日期（YYYY-MM-DD）：", new Date().toISOString().slice(0, 10));
    if (sellDate === null) return;
  } else if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
    const priceText = prompt('輸入「' + item.name + "」賣出單價：");
    if (priceText === null) return;
    sellPrice = Number(priceText);
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) return alert("賣出價格格式錯誤");
  }

  const nextSoldQty = soldQty + sellQty;
  items[idx] = {
    ...item,
    soldQty: nextSoldQty,
    sold: nextSoldQty >= totalQty,
    sellPrice: sellPrice,
    sellDate: sellDate || item.sellDate || new Date().toISOString().slice(0, 10)
  };
  saveItems();
  try {
    await upsertItemToCloud(items[idx]);
    if (isCloudReady()) setCloudStatus("賣出狀態已同步到雲端。");
  } catch (error) {
    setCloudStatus("賣出狀態已更新，但雲端同步失敗：" + error.message, true);
  }
  renderItems();
  openDetail(item.id);
}

function handleImageChange() {
  const file = imageInput.files && imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    pendingImageData = String((event.target && event.target.result) || "");
  };
  reader.readAsDataURL(file);
}

function exportCsv() {
  const header = ["名稱", "類別", "買入價格", "數量", "買入日期", "購買通路", "備註", "狀態", "賣出價格", "賣出日期", "損益"];
  const rows = items.map(function(item) {
    const soldQty = Number(item.soldQty || 0);
    const totalQty = Number(item.qty || 1);
    const status = soldQty >= totalQty ? "已賣出" : (soldQty > 0 ? "部分賣出" : "持有中");
    const pnl = soldQty > 0 ? (Number(item.sellPrice || 0) - Number(item.buyPrice || 0)) * soldQty : "";
    return [
      item.name,
      item.category,
      item.buyPrice,
      item.qty || 1,
      item.buyDate || "",
      item.source || "",
      item.note || "",
      status,
      item.sellPrice == null ? "" : item.sellPrice,
      item.sellDate || "",
      pnl
    ];
  });
  const csv = [header].concat(rows).map(function(row) {
    return row.map(function(cell) {
      const text = String(cell == null ? "" : cell).replace(/"/g, '""');
      return '"' + text + '"';
    }).join(",");
  }).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "collection-export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearFilters() {
  searchInput.value = "";
  filterCategory.value = "全部";
  filterStatus.value = "全部";
  renderItems();
}

addBtn.addEventListener("click", addItem);
categoryInput.addEventListener("change", updateSizeFieldVisibility);
document.getElementById("tradingOptionsToggleBtn").addEventListener("click", function(event) {
  event.stopPropagation();
  setOptionsPanelOpen(!isOptionsPanelOpen);
});
const amzOptionsToggleBtn = document.getElementById("amzOptionsToggleBtn");
if (amzOptionsToggleBtn) {
  amzOptionsToggleBtn.addEventListener("click", function(event) {
    event.stopPropagation();
    setAmzOptionsPanelOpen(!isAmzOptionsPanelOpen);
  });
}
const tradingOptionsBackdrop = document.getElementById("tradingOptionsBackdrop");
if (tradingOptionsBackdrop) {
  tradingOptionsBackdrop.addEventListener("click", function() {
    setOptionsPanelOpen(false);
  });
}
const optionsDetailBackdrop = document.getElementById("optionsDetailBackdrop");
if (optionsDetailBackdrop) {
  optionsDetailBackdrop.addEventListener("click", function() {
    closeAllOptionAccordions();
  });
}
const amzOptionsDetailBackdrop = document.getElementById("amzOptionsDetailBackdrop");
if (amzOptionsDetailBackdrop) {
  amzOptionsDetailBackdrop.addEventListener("click", function() {
    closeAllOptionAccordions();
  });
}
document.querySelectorAll(".options-acc-body").forEach(function(el) {
  el.addEventListener("click", function(event) {
    event.stopPropagation();
  });
});
document.querySelectorAll(".trading-opt-btn").forEach(function(btn) {
  btn.addEventListener("click", function(event) {
    event.stopPropagation();
    const kind = btn.getAttribute("data-opt");
    if (kind) toggleAccordion(kind);
  });
});
document.querySelectorAll(".amz-opt-btn").forEach(function(btn) {
  btn.addEventListener("click", function(event) {
    event.stopPropagation();
    const kind = btn.getAttribute("data-amz-opt");
    if (kind) toggleAmzAccordion(kind);
  });
});
saveEditBtn.addEventListener("click", saveEdit);
cancelEditBtn.addEventListener("click", endEdit);
markSoldBtn.addEventListener("click", markSelectedAsSold);
editBtn.addEventListener("click", function() { if (selectedId) beginEdit(selectedId); });
deleteBtn.addEventListener("click", function() { if (selectedId) removeItem(selectedId); });
closeModalBtn.addEventListener("click", function() { modal.close(); });
searchInput.addEventListener("input", renderItems);
filterCategory.addEventListener("change", renderItems);
filterStatus.addEventListener("change", renderItems);
exportCsvBtn.addEventListener("click", exportCsv);
clearFiltersBtn.addEventListener("click", clearFilters);
saveCloudConfigBtn.addEventListener("click", saveCloudConfig);
useLastCloudBtn.addEventListener("click", useLastCloudConfig);
pullCloudBtn.addEventListener("click", function() { pullCloudItems(false); });
pushCloudBtn.addEventListener("click", function() { pushAllToCloud(false); });
safeSyncBtn.addEventListener("click", safeSyncCloud);
imageInput.addEventListener("change", handleImageChange);
modal.addEventListener("click", function(event) {
  const rect = modal.getBoundingClientRect();
  const inside = rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
  if (!inside) modal.close();
});

initCloudConfigFromEnv();
cloudUrlInput.value = cloudConfig.url;
cloudKeyInput.value = cloudConfig.key;
cloudOwnerInput.value = cloudConfig.owner;
setCloudStatus(isCloudReady() ? "已讀取雲端設定，可按「載入雲端」。" : "尚未設定雲端同步，先在上方填入資訊。");

items = loadItems();
saveItems();
setAddFormOpen(false);
setOptionsPanelOpen(false);
setAmzOptionsPanelOpen(false);
updateSizeFieldVisibility();
renderItems();
if (isCloudReady()) {
  pullCloudItems(true);
}

const AMAZON_STORAGE_KEY = "amazon_items";

/** Amazon 測評線性流程（0–7），按鈕文案會顯示鄰近階段名稱 */
const AMZ_STATUS_LABELS = ["未到貨", "已到貨", "未評論", "已評論", "未上評", "已上評", "未退款", "已完成"];

function getAmazonStatusStep(item) {
  const n = item.statusStep;
  if (Number.isInteger(n) && n >= 0 && n <= 7) return n;
  const s = item.status;
  if (s === "received") return 1;
  if (s === "reviewed") return 5;
  if (s === "refunded") return 7;
  return 0;
}

function syncAmazonLegacyStatus(item) {
  const step = getAmazonStatusStep(item);
  item.statusStep = step;
  if (step === 0) item.status = "ordered";
  else if (step === 1) item.status = "received";
  else if (step >= 2 && step <= 6) item.status = "reviewed";
  else item.status = "refunded";
}

function getAmazonStepColor(step) {
  const colors = ["#ef4444", "#f59e0b", "#eab308", "#84cc16", "#14b8a6", "#3b82f6", "#8b5cf6", "#22c55e"];
  return colors[step] || "#64748b";
}

/** Amazon 列表篩選：`all` = 全部；其餘對應統計列按鈕 data-amz-filter */
let amazonListFilter = "all";

function getAmazonOrderTimeMs(item) {
  const d = item.date ? new Date(item.date) : new Date(0);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function compareAmazonByStepThenDateOldToNew(a, b) {
  const sa = getAmazonStatusStep(a);
  const sb = getAmazonStatusStep(b);
  if (sa !== sb) return sa - sb;
  return getAmazonOrderTimeMs(a) - getAmazonOrderTimeMs(b);
}

function amazonItemMatchesListFilter(item, filterKey) {
  const step = getAmazonStatusStep(item);
  const refund = Number(item.refund || 0);
  if (filterKey === "all") return true;
  if (filterKey === "s0") return step === 0;
  if (filterKey === "s1") return step === 1;
  if (filterKey === "s2") return step === 2;
  if (filterKey === "s3") return step === 3;
  if (filterKey === "s4") return step === 4;
  if (filterKey === "s5") return step === 5;
  if (filterKey === "s6hr") return step === 6 && refund > 0;
  if (filterKey === "s7") return step === 7;
  return true;
}

function syncAmazonFilterToolbarUi() {
  document.querySelectorAll("#amazonPage .amz-filter-stat[data-amz-filter]").forEach(function(btn) {
    const key = btn.getAttribute("data-amz-filter") || "all";
    const on = amazonListFilter !== "all" && key === amazonListFilter;
    btn.classList.toggle("amz-filter-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function normalizeReviewMode(mode) {
  const raw = String(mode || "none");
  if (raw === "text") return "text";
  if (raw === "image_text") return "image_text";
  if (raw === "video") return "video";
  if (raw === "image_text_video") return "image_text_video";
  return "none";
}

function getReviewModeLabel(mode) {
  if (mode === "text") return "文字評";
  if (mode === "image_text") return "圖文評";
  if (mode === "video") return "視頻";
  if (mode === "image_text_video") return "圖文+視頻";
  return "免評";
}

function formatAmazonDisplayDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function summarizeReviewText(text) {
  const content = String(text || "").trim();
  if (!content) return "";
  if (content.length <= 48) return content;
  return content.slice(0, 48) + "...";
}

function readImageFileAsDataUrl(file) {
  return new Promise(function(resolve, reject) {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = function(event) {
      resolve(String((event.target && event.target.result) || ""));
    };
    reader.onerror = function() {
      reject(new Error("讀取檔案失敗"));
    };
    reader.readAsDataURL(file);
  });
}

function normalizeAmazonRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(function(item) {
    let id = item.id;
    if (id == null || id === "") id = Date.now();
    const d = item.date ? new Date(item.date) : new Date();
    const iso = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();

    let statusStep = item.statusStep;
    if (typeof statusStep !== "number" || !Number.isFinite(statusStep)) {
      statusStep = NaN;
    } else {
      statusStep = Math.floor(statusStep);
    }
    if (!Number.isInteger(statusStep) || statusStep < 0 || statusStep > 7) {
      const valid = ["ordered", "received", "reviewed", "refunded"];
      const legacy = valid.indexOf(item.status) >= 0 ? item.status : "ordered";
      if (legacy === "received") statusStep = 1;
      else if (legacy === "reviewed") statusStep = 5;
      else if (legacy === "refunded") statusStep = 7;
      else statusStep = 0;
    }

    var legacyStatus;
    if (statusStep === 0) legacyStatus = "ordered";
    else if (statusStep === 1) legacyStatus = "received";
    else if (statusStep >= 2 && statusStep <= 6) legacyStatus = "reviewed";
    else legacyStatus = "refunded";

    return {
      id: id,
      name: String(item.name || ""),
      orderId: String(item.orderId || "").trim(),
      cost: Math.max(0, Number(item.cost || 0)),
      refund: Math.max(0, Number(item.refund || 0)),
      status: legacyStatus,
      statusStep: statusStep,
      date: iso,
      link: String(item.link || "").trim(),
      reviewMode: normalizeReviewMode(item.reviewMode),
      reviewText: String(item.reviewText || ""),
      reviewImage: String(item.reviewImage || ""),
      reviewVideo: String(item.reviewVideo || ""),
      productImage: String(item.productImage || "")
    };
  });
}

let amazonItems = [];
try {
  amazonItems = normalizeAmazonRows(JSON.parse(localStorage.getItem(AMAZON_STORAGE_KEY) || "[]"));
} catch (e) {
  amazonItems = [];
}

function saveAmazon() {
  localStorage.setItem(AMAZON_STORAGE_KEY, JSON.stringify(amazonItems));
}

function setAmzCloudStatus(message, isError) {
  const el = document.getElementById("amzCloudStatus");
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "#b91c1c" : "#475569";
}

async function upsertAmazonItemToCloud(item) {
  if (!isCloudReady()) return;
  await supabaseRequest(
    "POST",
    "amazon_items?on_conflict=owner_id,item_id",
    [{ owner_id: cloudConfig.owner, item_id: String(item.id), item_json: item }],
    { "Prefer": "resolution=merge-duplicates,return=minimal" }
  );
}

async function deleteAmazonItemFromCloud(itemId) {
  if (!isCloudReady()) return;
  await supabaseRequest(
    "DELETE",
    "amazon_items?owner_id=eq." + encodeURIComponent(cloudConfig.owner) + "&item_id=eq." + encodeURIComponent(String(itemId)),
    undefined,
    { "Prefer": "return=minimal" }
  );
}

async function pullAmazonFromCloud(opts) {
  opts = opts || {};
  const isSilent = Boolean(opts.silent);
  const throwOnError = Boolean(opts.throwOnError);
  if (!isSilent) refreshCloudConfigFromInputs();
  if (!isCloudReady()) {
    if (!isSilent) setAmzCloudStatus("請先在「設定」填寫 Supabase URL / Anon Key / 帳本代號。", true);
    return;
  }
  try {
    if (!isSilent) setAmzCloudStatus("載入 Amazon 雲端資料中...");
    const rows = await supabaseRequest(
      "GET",
      "amazon_items?owner_id=eq." + encodeURIComponent(cloudConfig.owner) + "&select=item_json",
      undefined
    );
    const rawList = Array.isArray(rows) ? rows.map(function(r) { return r.item_json; }).filter(Boolean) : [];
    amazonItems = normalizeAmazonRows(rawList);
    saveAmazon();
    rememberLastUsedCloudConfig();
    renderAmazon();
    if (!isSilent) setAmzCloudStatus("已載入 Amazon，共 " + amazonItems.length + " 筆。");
  } catch (error) {
    if (!isSilent) setAmzCloudStatus("Amazon 載入失敗：" + error.message, true);
    if (throwOnError) throw error;
  }
}

async function pushAllAmazonToCloud(isSilent) {
  if (!isSilent) refreshCloudConfigFromInputs();
  if (!isCloudReady()) {
    if (!isSilent) setAmzCloudStatus("請先在「設定」填寫雲端資料。", true);
    return;
  }
  try {
    if (!isSilent) setAmzCloudStatus("推送 Amazon 到雲端中...");
    for (let i = 0; i < amazonItems.length; i++) {
      await upsertAmazonItemToCloud(amazonItems[i]);
    }
    rememberLastUsedCloudConfig();
    if (!isSilent) setAmzCloudStatus("Amazon 推送完成，共 " + amazonItems.length + " 筆。");
  } catch (error) {
    if (!isSilent) setAmzCloudStatus("Amazon 推送失敗：" + error.message, true);
    throw error;
  }
}

function updateAmzReviewMediaFields() {
  const modeEl = document.getElementById("amzReviewMode");
  const imgWrap = document.getElementById("amzReviewImageField");
  const vidWrap = document.getElementById("amzReviewVideoField");
  if (!modeEl || !imgWrap || !vidWrap) return;
  const mode = normalizeReviewMode(modeEl.value);
  const showImg = mode === "image_text" || mode === "image_text_video";
  const showVid = mode === "video" || mode === "image_text_video";
  imgWrap.hidden = !showImg;
  vidWrap.hidden = !showVid;
  imgWrap.style.display = showImg ? "flex" : "none";
  vidWrap.style.display = showVid ? "flex" : "none";
  if (!showImg) {
    const imgIn = document.getElementById("amzReviewImage");
    if (imgIn) imgIn.value = "";
  }
  if (!showVid) {
    const vidIn = document.getElementById("amzReviewVideo");
    if (vidIn) vidIn.value = "";
  }
}

function initAmzEditStatusStepSelect() {
  const sel = document.getElementById("amzEditStatusStep");
  if (!sel || sel.getAttribute("data-inited") === "1") return;
  sel.setAttribute("data-inited", "1");
  sel.innerHTML = "";
  for (let i = 0; i < AMZ_STATUS_LABELS.length; i++) {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = AMZ_STATUS_LABELS[i];
    sel.appendChild(o);
  }
}

function updateAmzEditReviewMediaFields() {
  const modeEl = document.getElementById("amzEditReviewMode");
  const imgWrap = document.getElementById("amzEditReviewImageField");
  const vidWrap = document.getElementById("amzEditReviewVideoField");
  if (!modeEl || !imgWrap || !vidWrap) return;
  const mode = normalizeReviewMode(modeEl.value);
  const showImg = mode === "image_text" || mode === "image_text_video";
  const showVid = mode === "video" || mode === "image_text_video";
  imgWrap.hidden = !showImg;
  vidWrap.hidden = !showVid;
  imgWrap.style.display = showImg ? "flex" : "none";
  vidWrap.style.display = showVid ? "flex" : "none";
  if (!showImg) {
    const imgIn = document.getElementById("amzEditReviewImage");
    if (imgIn) imgIn.value = "";
  }
  if (!showVid) {
    const vidIn = document.getElementById("amzEditReviewVideo");
    if (vidIn) vidIn.value = "";
  }
}

function closeAmazonEdit() {
  const wrap = document.getElementById("amzAccBodyEdit");
  if (wrap) wrap.hidden = true;
  ["amzEditProductImage", "amzEditReviewImage", "amzEditReviewVideo"].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  updateDetailBackdrop();
}

function openAmazonEdit(itemId) {
  initAmzEditStatusStepSelect();
  const item = amazonItems.find(function(i) { return String(i.id) === String(itemId); });
  if (!item) return;
  setAmzOptionsPanelOpen(false);
  setAmzAccordionOpen("add", false);
  setAmzAccordionOpen("cloud", false);

  const idEl = document.getElementById("amzEditItemId");
  const nameEl = document.getElementById("amzEditName");
  const orderIdEl = document.getElementById("amzEditOrderId");
  const costEl = document.getElementById("amzEditCost");
  const dateEl = document.getElementById("amzEditOrderDate");
  const linkEl = document.getElementById("amzEditLink");
  const modeEl = document.getElementById("amzEditReviewMode");
  const textEl = document.getElementById("amzEditReviewText");
  const stepEl = document.getElementById("amzEditStatusStep");
  const refundEl = document.getElementById("amzEditRefund");
  if (!idEl || !nameEl || !orderIdEl || !costEl || !dateEl || !linkEl || !modeEl || !textEl || !stepEl || !refundEl) return;

  idEl.value = String(item.id);
  nameEl.value = item.name || "";
  orderIdEl.value = item.orderId || "";
  costEl.value = String(item.cost != null ? item.cost : "");
  dateEl.value = formatAmazonDisplayDate(item.date);
  linkEl.value = item.link || "";
  modeEl.value = normalizeReviewMode(item.reviewMode);
  textEl.value = item.reviewText || "";
  stepEl.value = String(getAmazonStatusStep(item));
  refundEl.value = String(item.refund != null ? item.refund : 0);

  ["amzEditProductImage", "amzEditReviewImage", "amzEditReviewVideo"].forEach(function(fid) {
    const el = document.getElementById(fid);
    if (el) el.value = "";
  });
  updateAmzEditReviewMediaFields();

  const wrap = document.getElementById("amzAccBodyEdit");
  if (wrap) wrap.hidden = false;
  updateDetailBackdrop();
}

async function saveAmazonEdit() {
  const idEl = document.getElementById("amzEditItemId");
  const rawId = idEl && idEl.value;
  const item = amazonItems.find(function(i) { return String(i.id) === String(rawId); });
  if (!item) return;

  const name = document.getElementById("amzEditName").value.trim();
  const orderId = document.getElementById("amzEditOrderId").value.trim();
  const cost = Number(document.getElementById("amzEditCost").value);
  const orderDateValue = String(document.getElementById("amzEditOrderDate").value || "").trim();
  const orderDate = orderDateValue || getTodayIsoDate();
  const link = document.getElementById("amzEditLink").value.trim();
  const reviewMode = normalizeReviewMode(document.getElementById("amzEditReviewMode").value);
  const reviewText = document.getElementById("amzEditReviewText").value;
  const stepRaw = Number(document.getElementById("amzEditStatusStep").value);
  const refund = Number(document.getElementById("amzEditRefund").value);

  if (!name || !orderId || !orderDate || !Number.isFinite(cost) || cost <= 0) {
    alert("請填寫商品名稱、訂單編號、下訂日期與正確成本");
    return;
  }
  if (!Number.isInteger(stepRaw) || stepRaw < 0 || stepRaw > 7) {
    alert("請選擇有效的流程狀態");
    return;
  }
  if (!Number.isFinite(refund) || refund < 0) {
    alert("退款金額需為 0 以上的數字");
    return;
  }

  const productImageInput = document.getElementById("amzEditProductImage");
  const reviewImageInput = document.getElementById("amzEditReviewImage");
  const reviewVideoInput = document.getElementById("amzEditReviewVideo");
  const productFile = productImageInput && productImageInput.files && productImageInput.files[0];
  const reviewImageFile = reviewImageInput && reviewImageInput.files && reviewImageInput.files[0];
  const reviewVideoFile = reviewVideoInput && reviewVideoInput.files && reviewVideoInput.files[0];

  try {
    if (productFile) item.productImage = await readImageFileAsDataUrl(productFile);
    if (reviewImageFile) item.reviewImage = await readImageFileAsDataUrl(reviewImageFile);
    if (reviewVideoFile) item.reviewVideo = await readImageFileAsDataUrl(reviewVideoFile);
  } catch (error) {
    alert(error.message || "檔案讀取失敗");
    return;
  }

  item.name = name;
  item.orderId = orderId;
  item.cost = cost;
  item.date = new Date(orderDate + "T00:00:00").toISOString();
  item.link = link;
  item.reviewMode = reviewMode;
  item.reviewText = String(reviewText || "");
  item.statusStep = stepRaw;
  syncAmazonLegacyStatus(item);
  item.refund = Math.max(0, refund);

  saveAmazon();
  closeAmazonEdit();
  renderAmazon();
  try {
    await upsertAmazonItemToCloud(item);
    if (isCloudReady()) setAmzCloudStatus("編輯已同步到 Amazon 雲端。");
  } catch (error) {
    setAmzCloudStatus("本機已更新，但 Amazon 雲端同步失敗：" + error.message, true);
  }
}

async function addAmazonItem() {
  const nameInput = document.getElementById("amzName");
  const orderIdInput = document.getElementById("amzOrderId");
  const costInput = document.getElementById("amzCost");
  const orderDateInput = document.getElementById("amzOrderDate");
  const linkInput = document.getElementById("amzLink");
  const reviewModeInput = document.getElementById("amzReviewMode");
  const productImageInput = document.getElementById("amzProductImage");
  const reviewImageInput = document.getElementById("amzReviewImage");
  const reviewVideoInput = document.getElementById("amzReviewVideo");
  const name = nameInput.value.trim();
  const orderId = orderIdInput.value.trim();
  const cost = Number(costInput.value);
  const orderDateValue = String(orderDateInput.value || "").trim();
  const orderDate = orderDateValue || getTodayIsoDate();
  const link = linkInput.value.trim();
  const reviewMode = normalizeReviewMode(reviewModeInput.value);
  if (!name || !orderId || !orderDate || !Number.isFinite(cost) || cost <= 0) {
    alert("請填寫商品名稱、訂單編號、下訂日期與正確成本");
    return;
  }
  const productImageFile = productImageInput.files && productImageInput.files[0];
  const reviewImageFile = reviewImageInput && reviewImageInput.files && reviewImageInput.files[0];
  const reviewVideoFile = reviewVideoInput && reviewVideoInput.files && reviewVideoInput.files[0];
  let productImage = "";
  let reviewImage = "";
  let reviewVideo = "";
  try {
    productImage = await readImageFileAsDataUrl(productImageFile);
    reviewImage = await readImageFileAsDataUrl(reviewImageFile);
    reviewVideo = await readImageFileAsDataUrl(reviewVideoFile);
  } catch (error) {
    alert(error.message || "圖片讀取失敗");
    return;
  }
  const newItem = {
    id: Date.now(),
    name: name,
    orderId: orderId,
    cost: cost,
    refund: 0,
    status: "ordered",
    statusStep: 0,
    date: new Date(orderDate + "T00:00:00").toISOString(),
    link: link,
    reviewMode: reviewMode,
    reviewText: "",
    reviewImage: reviewImage,
    reviewVideo: reviewVideo,
    productImage: productImage
  };
  amazonItems.unshift(newItem);
  saveAmazon();
  nameInput.value = "";
  orderIdInput.value = "";
  costInput.value = "";
  orderDateInput.value = getTodayIsoDate();
  linkInput.value = "";
  reviewModeInput.value = "none";
  productImageInput.value = "";
  if (reviewImageInput) reviewImageInput.value = "";
  if (reviewVideoInput) reviewVideoInput.value = "";
  updateAmzReviewMediaFields();
  renderAmazon();
  try {
    await upsertAmazonItemToCloud(newItem);
    if (isCloudReady()) setAmzCloudStatus("新增已同步到 Amazon 雲端。");
  } catch (error) {
    setAmzCloudStatus("本機已存，但 Amazon 雲端同步失敗：" + error.message, true);
  }
}

async function advanceAmazonStep(id) {
  const item = amazonItems.find(function(i) { return i.id == id; });
  if (!item) return;
  const step = getAmazonStatusStep(item);
  if (step >= 7) return;
  if (step === 6) {
    const amount = prompt("輸入退款金額：");
    if (amount == null || String(amount).trim() === "") return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      alert("請輸入正確退款金額");
      return;
    }
    item.refund = n;
  }
  item.statusStep = step + 1;
  syncAmazonLegacyStatus(item);
  saveAmazon();
  renderAmazon();
  try {
    await upsertAmazonItemToCloud(item);
    if (isCloudReady()) setAmzCloudStatus("狀態已同步到 Amazon 雲端。");
  } catch (error) {
    setAmzCloudStatus("本機已更新，但 Amazon 雲端同步失敗：" + error.message, true);
  }
}

async function rewindAmazonStep(id) {
  const item = amazonItems.find(function(i) { return i.id == id; });
  if (!item) return;
  const step = getAmazonStatusStep(item);
  if (step <= 0) return;
  item.statusStep = step - 1;
  syncAmazonLegacyStatus(item);
  saveAmazon();
  renderAmazon();
  try {
    await upsertAmazonItemToCloud(item);
    if (isCloudReady()) setAmzCloudStatus("狀態已同步到 Amazon 雲端。");
  } catch (error) {
    setAmzCloudStatus("本機已更新，但 Amazon 雲端同步失敗：" + error.message, true);
  }
}

async function setRefund(id) {
  const amount = prompt("輸入退款金額：");
  const item = amazonItems.find(function(i) { return i.id == id; });
  if (!item) return;
  if (amount == null || String(amount).trim() === "") return;
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) {
    alert("請輸入正確金額");
    return;
  }
  item.refund = n;
  saveAmazon();
  renderAmazon();
  try {
    await upsertAmazonItemToCloud(item);
    if (isCloudReady()) setAmzCloudStatus("退款已同步到 Amazon 雲端。");
  } catch (error) {
    setAmzCloudStatus("本機已更新，但 Amazon 雲端同步失敗：" + error.message, true);
  }
}

async function deleteAmazonItem(id) {
  const item = amazonItems.find(function(i) { return i.id == id; });
  if (!item) return;
  if (!confirm("確定刪除「" + item.name + "」嗎？")) return;
  const sid = String(id);
  amazonItems = amazonItems.filter(function(i) { return String(i.id) !== sid; });
  saveAmazon();
  renderAmazon();
  try {
    await deleteAmazonItemFromCloud(sid);
    if (isCloudReady()) setAmzCloudStatus("刪除已同步到 Amazon 雲端。");
  } catch (error) {
    setAmzCloudStatus("本機已刪除，但 Amazon 雲端刪除失敗：" + error.message, true);
  }
}

function getDaysPassed(date) {
  const t = new Date(date).getTime();
  if (isNaN(t)) return 0;
  const diff = Date.now() - t;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function safeAmazonHref(link) {
  const s = String(link || "").trim();
  if (/^https?:\/\//i.test(s)) return s;
  return "";
}

function renderAmazon() {
  const list = document.getElementById("amzList");
  const emptyAmz = document.getElementById("amzEmptyState");
  if (!list) return;

  list.innerHTML = "";

  let totalCost = 0;
  let totalRefund = 0;
  let completed = 0;
  let cntArrived = 0;
  let cntNotArrived = 0;
  let cntStep2 = 0;
  let cntStep3 = 0;
  let cntStep4 = 0;
  let cntStep5 = 0;
  let cntRefundRecorded = 0;
  let cntDone = 0;

  amazonItems.forEach(function(item) {
    const step = getAmazonStatusStep(item);
    const refundN = Number(item.refund || 0);
    totalCost += item.cost;
    totalRefund += item.refund;
    if (step === 7) completed++;

    if (step === 1) cntArrived++;
    if (step === 0) cntNotArrived++;
    if (step === 2) cntStep2++;
    if (step === 3) cntStep3++;
    if (step === 4) cntStep4++;
    if (step === 5) cntStep5++;
    if (step === 6 && refundN > 0) cntRefundRecorded++;
    if (step === 7) cntDone++;
  });

  const toShow = amazonItems
    .filter(function(item) {
      return amazonItemMatchesListFilter(item, amazonListFilter);
    })
    .sort(compareAmazonByStepThenDateOldToNew);

  toShow.forEach(function(item) {
    const step = getAmazonStatusStep(item);
    const reviewMode = normalizeReviewMode(item.reviewMode);
    const days = getDaysPassed(item.date);
    let warning = "";
    if (step < 7 && days > 5) {
      warning = "⚠️ 超過5天未完成";
    }
    if (step === 6 && item.refund === 0) {
      warning = "💸 還沒退款！";
    }

    const warnHtml = warning ? '<div class="amz-warn">' + escapeHtml(warning) + "</div>" : "";
    const displayDate = formatAmazonDisplayDate(item.date);
    const orderId = String(item.orderId || "").trim() || "-";
    const productImageBlock = item.productImage
      ? '<img class="thumb amz-product-image" src="' + item.productImage + '" alt="' + escapeHtml(item.name) + '">'
      : '<div class="emoji amz-product-placeholder">🛒</div>';

    const statusLabel = AMZ_STATUS_LABELS[step];
    const statusColor = getAmazonStepColor(step);

    const card = document.createElement("article");
    card.className = "item-card amz-card";
    card.innerHTML =
      '<div class="item-name">' + escapeHtml(item.name) + "</div>" +
      productImageBlock +
      '<div class="amz-status-pill-wrap">' +
      '<span class="tag amz-status-pill" style="background:' +
      statusColor +
      ';border-color:rgba(15,23,42,0.2);color:#fff;">' +
      escapeHtml(statusLabel) +
      "</span></div>" +
      '<div class="meta"><strong>訂單編號：</strong>' + escapeHtml(orderId) + "</div>" +
      '<div class="meta"><strong>金額：</strong>' + formatMoney(item.cost) + "</div>" +
      '<div class="meta"><strong>日期：</strong>' + displayDate + "</div>" +
      '<div class="meta"><strong>評論：</strong>' + getReviewModeLabel(reviewMode) + "</div>" +
      '<div class="meta">退款：' + formatMoney(item.refund) + "</div>" +
      '<div class="meta">天數：' + days + " 天</div>" +
      warnHtml +
      '<div class="amz-card-footer">' +
      '<div class="amz-card-nav">' +
      '<button type="button" class="btn secondary amz-nav-prev"></button>' +
      '<button type="button" class="btn secondary amz-nav-next"></button>' +
      "</div>" +
      '<button type="button" class="amz-delete-btn" aria-label="刪除">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>' +
      "</svg></button>" +
      "</div>";

    const prevBtn = card.querySelector(".amz-nav-prev");
    const nextBtn = card.querySelector(".amz-nav-next");
    const delBtn = card.querySelector(".amz-delete-btn");

    if (step > 0) {
      prevBtn.textContent = "\u2190 " + AMZ_STATUS_LABELS[step - 1];
    } else {
      prevBtn.textContent = "\u2014";
    }
    prevBtn.disabled = step <= 0;
    prevBtn.title = step > 0 ? "回到「" + AMZ_STATUS_LABELS[step - 1] + "」" : "";

    if (step < 7) {
      const nextLabel = step === 6 ? "已退款" : AMZ_STATUS_LABELS[step + 1];
      nextBtn.textContent = nextLabel + " \u2192";
    } else {
      nextBtn.textContent = AMZ_STATUS_LABELS[7];
    }
    nextBtn.disabled = step >= 7;
    nextBtn.title = step < 7
      ? "前往「" + (step === 6 ? "已退款" : AMZ_STATUS_LABELS[step + 1]) + "」"
      : "目前為最後階段「已完成」";

    prevBtn.addEventListener("click", function(event) {
      event.stopPropagation();
      rewindAmazonStep(item.id);
    });
    nextBtn.addEventListener("click", function(event) {
      event.stopPropagation();
      advanceAmazonStep(item.id);
    });

    delBtn.addEventListener("click", function(event) {
      event.stopPropagation();
      deleteAmazonItem(item.id);
    });

    card.addEventListener("click", function(event) {
      if (event.target.closest(".amz-card-footer")) return;
      openAmazonEdit(item.id);
    });

    list.appendChild(card);
  });

  if (emptyAmz) {
    if (amazonItems.length === 0) {
      emptyAmz.hidden = false;
      emptyAmz.textContent = "目前沒有 Amazon 測評訂單，請用上方「新增訂單」加入。";
    } else if (toShow.length === 0) {
      emptyAmz.hidden = false;
      emptyAmz.textContent = "沒有符合此篩選的訂單。點「總訂單數」可回到全部列表。";
    } else {
      emptyAmz.hidden = true;
    }
  }

  syncAmazonFilterToolbarUi();

  const expenseEl = document.getElementById("amzExpense");
  const refundEl = document.getElementById("amzRefund");
  const profitEl = document.getElementById("amzProfit");
  const rateEl = document.getElementById("amzRate");
  if (expenseEl) expenseEl.textContent = formatMoney(totalCost);
  if (refundEl) refundEl.textContent = formatMoney(totalRefund);
  if (profitEl) {
    const profit = totalRefund - totalCost;
    profitEl.textContent = formatMoney(profit);
    profitEl.className = "value " + (profit >= 0 ? "profit" : "loss");
  }
  if (rateEl) {
    const rate = amazonItems.length ? Math.round((completed / amazonItems.length) * 100) : 0;
    rateEl.textContent = rate + "%";
  }

  const totalN = amazonItems.length;
  function setAmzCount(id, n) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(n);
  }
  setAmzCount("amzCntTotal", totalN);
  setAmzCount("amzCntNotArrived", cntNotArrived);
  setAmzCount("amzCntArrived", cntArrived);
  setAmzCount("amzCntStepNoComment", cntStep2);
  setAmzCount("amzCntStepCommented", cntStep3);
  setAmzCount("amzCntStepNotPosted", cntStep4);
  setAmzCount("amzCntStepPosted", cntStep5);
  setAmzCount("amzCntRefundRecorded", cntRefundRecorded);
  setAmzCount("amzCntDone", cntDone);
}

const amzAddBtn = document.getElementById("amzAddBtn");
if (amzAddBtn) amzAddBtn.addEventListener("click", addAmazonItem);
const amzOrderDateInput = document.getElementById("amzOrderDate");
if (amzOrderDateInput && !amzOrderDateInput.value) amzOrderDateInput.value = getTodayIsoDate();
const amzReviewModeInputForMedia = document.getElementById("amzReviewMode");
if (amzReviewModeInputForMedia) {
  amzReviewModeInputForMedia.addEventListener("change", updateAmzReviewMediaFields);
  updateAmzReviewMediaFields();
}
const amzPullCloudBtn = document.getElementById("amzPullCloudBtn");
const amzPushCloudBtn = document.getElementById("amzPushCloudBtn");
if (amzPullCloudBtn) amzPullCloudBtn.addEventListener("click", function() { pullAmazonFromCloud({ silent: false }); });
if (amzPushCloudBtn) amzPushCloudBtn.addEventListener("click", function() { pushAllAmazonToCloud(false); });

document.querySelectorAll("#amazonPage .amz-filter-stat[data-amz-filter]").forEach(function(btn) {
  btn.addEventListener("click", function() {
    amazonListFilter = btn.getAttribute("data-amz-filter") || "all";
    renderAmazon();
  });
});

const amzEditSaveBtn = document.getElementById("amzEditSaveBtn");
const amzEditCancelBtn = document.getElementById("amzEditCancelBtn");
const amzEditReviewModeEl = document.getElementById("amzEditReviewMode");
if (amzEditSaveBtn) amzEditSaveBtn.addEventListener("click", function() { saveAmazonEdit(); });
if (amzEditCancelBtn) amzEditCancelBtn.addEventListener("click", function() { closeAmazonEdit(); });
if (amzEditReviewModeEl) amzEditReviewModeEl.addEventListener("change", updateAmzEditReviewMediaFields);

function goPage(page) {
  if (page !== "amazon") closeAmazonEdit();
  document.getElementById("homePage").style.display = "none";
  document.getElementById("tradingPage").style.display = "none";
  document.getElementById("amazonPage").style.display = "none";
  document.getElementById("legoPage").style.display = "none";
  setOptionsPanelOpen(false);
  setAmzOptionsPanelOpen(false);

  if (page === "home") {
    document.getElementById("homePage").style.display = "block";
  }
  if (page === "trading") {
    document.getElementById("tradingPage").style.display = "block";
  }
  if (page === "amazon") {
    document.getElementById("amazonPage").style.display = "block";
    renderAmazon();
  }
  if (page === "lego") {
    document.getElementById("legoPage").style.display = "block";
  }
}

(async function() {
  setAmzCloudStatus(
    isCloudReady()
      ? "已連線雲端；可載入／推送 Amazon（Supabase 需有 amazon_items 表）。"
      : "請先在「收藏買賣」→ 設定填寫同一組 Supabase。",
    false
  );
  if (isCloudReady()) {
    await pullAmazonFromCloud({ silent: true });
  }
  renderAmazon();
  goPage("home");
})();
