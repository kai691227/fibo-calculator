
const DEFAULT_PRESETS = [
  {
    id: "standard",
    name: "標準費波",
    levels: [
      { ratio: 0, label: "0%", enabled: true },
      { ratio: 0.236, label: "23.6%", enabled: true },
      { ratio: 0.382, label: "38.2%", enabled: true },
      { ratio: 0.5, label: "50%", enabled: true },
      { ratio: 0.618, label: "61.8%", enabled: true },
      { ratio: 0.786, label: "78.6%", enabled: true },
      { ratio: 1, label: "100%", enabled: true },
      { ratio: 1.272, label: "127.2%", enabled: true },
      { ratio: 1.618, label: "161.8%", enabled: true },
      { ratio: 2, label: "200%", enabled: true }
    ]
  }
];

const $ = (id) => document.getElementById(id);
const els = {
  high: $("highInput"),
  low: $("lowInput"),
  current: $("currentInput"),
  preset: $("presetSelect"),
  results: $("results"),
  summaryCard: $("summaryCard"),
  resultCard: $("resultCard"),
  rangeValue: $("rangeValue"),
  directionValue: $("directionValue"),
  nearestValue: $("nearestValue"),
  settingsDialog: $("settingsDialog"),
  levelEditor: $("levelEditor"),
  presetName: $("presetNameInput"),
  toast: $("toast")
};

let direction = localStorage.getItem("fibo_direction") || "up";
let presets = JSON.parse(localStorage.getItem("fibo_presets") || "null") || DEFAULT_PRESETS;
let selectedPresetId = localStorage.getItem("fibo_selected_preset") || presets[0].id;
let lastResults = [];

function saveState() {
  localStorage.setItem("fibo_presets", JSON.stringify(presets));
  localStorage.setItem("fibo_selected_preset", selectedPresetId);
  localStorage.setItem("fibo_direction", direction);
  localStorage.setItem("fibo_inputs", JSON.stringify({
    high: els.high.value,
    low: els.low.value,
    current: els.current.value
  }));
}

function loadInputs() {
  const saved = JSON.parse(localStorage.getItem("fibo_inputs") || "{}");
  els.high.value = saved.high || "";
  els.low.value = saved.low || "";
  els.current.value = saved.current || "";
}

function renderPresetOptions() {
  els.preset.innerHTML = "";
  presets.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.name;
    option.selected = p.id === selectedPresetId;
    els.preset.appendChild(option);
  });
}

function applyDirectionUI() {
  document.querySelectorAll(".seg-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.direction === direction);
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 3 }).format(value);
}

function calculate() {
  const high = Number(els.high.value);
  const low = Number(els.low.value);
  const current = els.current.value === "" ? null : Number(els.current.value);

  if (!Number.isFinite(high) || !Number.isFinite(low)) {
    showToast("請輸入高點與低點");
    return;
  }
  if (high <= low) {
    showToast("高點必須大於低點");
    return;
  }

  const preset = presets.find(p => p.id === selectedPresetId) || presets[0];
  const range = high - low;
  const enabledLevels = preset.levels.filter(l => l.enabled);

  lastResults = enabledLevels.map(level => {
    let price;
    if (direction === "up") {
      price = high - range * level.ratio;
    } else {
      price = low + range * level.ratio;
    }
    return { ...level, price };
  }).sort((a, b) => b.price - a.price);

  let nearest = null;
  if (current !== null && Number.isFinite(current) && lastResults.length) {
    nearest = lastResults.reduce((best, item) =>
      Math.abs(item.price - current) < Math.abs(best.price - current) ? item : best
    );
  }

  els.rangeValue.textContent = `${formatNumber(range)} 點`;
  els.directionValue.textContent = direction === "up" ? "上漲回撤" : "下跌反彈";
  els.nearestValue.textContent = nearest
    ? `${nearest.label} · ${formatNumber(nearest.price)}`
    : "未輸入現價";

  els.results.innerHTML = "";
  lastResults.forEach(item => {
    const row = document.createElement("div");
    row.className = "result-row" + (nearest === item ? " nearest" : "");
    row.innerHTML = `
      <div class="result-meta">
        <strong>${escapeHtml(item.label || `${item.ratio * 100}%`)}</strong>
        <span>比例 ${formatNumber(item.ratio)}</span>
      </div>
      <div class="result-price">${formatNumber(item.price)}</div>
    `;
    els.results.appendChild(row);
  });

  els.summaryCard.classList.remove("hidden");
  els.resultCard.classList.remove("hidden");
  saveState();
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 1600);
}

function openSettings() {
  const preset = presets.find(p => p.id === selectedPresetId) || presets[0];
  els.presetName.value = preset.name;
  els.levelEditor.innerHTML = "";
  preset.levels.forEach((level, index) => addLevelRow(level, index));
  els.settingsDialog.showModal();
}

function addLevelRow(level = { ratio: 0.333, label: "自訂", enabled: true }, index = null) {
  const row = document.createElement("div");
  row.className = "level-row";
  row.innerHTML = `
    <input class="level-enabled" type="checkbox" ${level.enabled ? "checked" : ""} aria-label="啟用此比例">
    <input class="level-ratio" type="number" step="0.001" value="${level.ratio}" aria-label="比例">
    <input class="level-label" type="text" value="${escapeHtml(level.label)}" aria-label="名稱">
    <button type="button" class="remove-btn" aria-label="刪除此比例">刪</button>
  `;
  row.querySelector(".remove-btn").addEventListener("click", () => row.remove());
  els.levelEditor.appendChild(row);
}

function savePresetFromEditor() {
  const name = els.presetName.value.trim() || "我的費波";
  const levels = [...els.levelEditor.querySelectorAll(".level-row")].map(row => ({
    enabled: row.querySelector(".level-enabled").checked,
    ratio: Number(row.querySelector(".level-ratio").value),
    label: row.querySelector(".level-label").value.trim() || "未命名"
  })).filter(level => Number.isFinite(level.ratio));

  if (!levels.length) {
    showToast("至少保留一個有效比例");
    return;
  }

  const preset = presets.find(p => p.id === selectedPresetId);
  preset.name = name;
  preset.levels = levels.sort((a, b) => a.ratio - b.ratio);
  saveState();
  renderPresetOptions();
  els.settingsDialog.close();
  showToast("參數已儲存");
  if (!els.resultCard.classList.contains("hidden")) calculate();
}

document.querySelectorAll(".seg-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    direction = btn.dataset.direction;
    applyDirectionUI();
    saveState();
    if (!els.resultCard.classList.contains("hidden")) calculate();
  });
});

$("calcBtn").addEventListener("click", calculate);

$("clearBtn").addEventListener("click", () => {
  els.high.value = "";
  els.low.value = "";
  els.current.value = "";
  els.summaryCard.classList.add("hidden");
  els.resultCard.classList.add("hidden");
  lastResults = [];
  saveState();
});

$("copyBtn").addEventListener("click", async () => {
  if (!lastResults.length) return;
  const header = `費波計算結果｜${direction === "up" ? "上漲回撤" : "下跌反彈"}`;
  const text = [header, ...lastResults.map(r => `${r.label}\t${formatNumber(r.price)}`)].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    showToast("已複製全部結果");
  } catch {
    showToast("瀏覽器不允許複製");
  }
});

els.preset.addEventListener("change", () => {
  selectedPresetId = els.preset.value;
  saveState();
  if (!els.resultCard.classList.contains("hidden")) calculate();
});

$("settingsBtn").addEventListener("click", openSettings);
$("addLevelBtn").addEventListener("click", () => addLevelRow());
$("savePresetBtn").addEventListener("click", savePresetFromEditor);

$("resetBtn").addEventListener("click", () => {
  presets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
  selectedPresetId = presets[0].id;
  saveState();
  renderPresetOptions();
  openSettings();
  showToast("已恢復標準參數");
});

["highInput", "lowInput", "currentInput"].forEach(id => {
  $(id).addEventListener("input", saveState);
});

loadInputs();
renderPresetOptions();
applyDirectionUI();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
