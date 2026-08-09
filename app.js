const DEFAULT_SETTINGS = {
  mode: "points", remember: true, name: "中心費波",
  levels: [
    { ratio: 0.336, label: "第1層", enabled: true },
    { ratio: 0.544, label: "第2層", enabled: true },
    { ratio: 0.6916, label: "第3層", enabled: true },
    { ratio: 0.880, label: "第4層", enabled: true }
  ]
};
const $ = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));
let settings = clone(DEFAULT_SETTINGS);
try {
  const saved = JSON.parse(localStorage.getItem("fibo_nav_settings_v12") || "null");
  if (saved) settings = { ...settings, ...saved };
} catch {}
let mode = settings.mode;
let lastCalculation = null;

function formatPrice(value) {
  if (Number.isInteger(value)) return new Intl.NumberFormat("zh-TW").format(value);
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 1 }).format(value);
}
function formatRatio(value) { return Number(value).toFixed(4).replace(/0+$/, "").replace(/\.$/, ""); }
function roundedPoint(value) { return Math.round(value); }
function escapeHtml(text) { return String(text).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function showToast(message) { const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>el.classList.remove("show"),1600); }

function activeLevels() {
  return settings.levels.filter(x => x.enabled && Number.isFinite(Number(x.ratio)) && Number(x.ratio) > 0)
    .map(x => ({...x, ratio:Number(x.ratio)})).sort((a,b)=>a.ratio-b.ratio);
}
function calculateValues(high, low, levels=activeLevels()) {
  const range = high-low, center=(high+low)/2;
  const pairs=levels.map((level,index)=>({
    ...level, index:index+1, distance:range*level.ratio,
    up:roundedPoint(center+range*level.ratio), down:roundedPoint(center-range*level.ratio)
  }));
  return {high,low,range,center,pairs};
}
function calculate() {
  const high=Number($("highInput").value), low=Number($("lowInput").value);
  const current=$("currentInput").value===""?null:Number($("currentInput").value);
  if(!Number.isFinite(high)||!Number.isFinite(low)) return showToast("請輸入最高與最低");
  if(high<=low) return showToast("最高必須大於最低");
  const levels=activeLevels(); if(!levels.length) return showToast("請至少啟用一組參數");
  lastCalculation=calculateValues(high,low,levels); renderResults(current); saveInputs();
}
function renderResults(current=null) {
  const c=lastCalculation; if(!c) return;
  const items=[];
  [...c.pairs].reverse().forEach(p=>items.push({side:"up",name:`上${p.index}`,price:p.up,ratio:p.ratio,distance:roundedPoint(p.distance)}));
  items.push({side:"center",name:"多空",price:c.center,ratio:null,distance:0});
  c.pairs.forEach(p=>items.push({side:"down",name:`下${p.index}`,price:p.down,ratio:p.ratio,distance:-roundedPoint(p.distance)}));
  let nearest=null;
  if(Number.isFinite(current)) nearest=items.reduce((a,b)=>Math.abs(b.price-current)<Math.abs(a.price-current)?b:a);
  $("results").innerHTML=items.map(item=>`<div class="level ${item.side}${nearest===item?" nearest":""}">
    <span class="level-name">${item.side==="up"?"↑ ":item.side==="down"?"↓ ":"● "}${item.name}</span>
    <span class="detail ratio">${item.ratio===null?"—":formatRatio(item.ratio)}</span>
    <span class="detail distance">${item.distance>0?"+":""}${item.distance}</span>
    <strong>${formatPrice(item.price)}</strong></div>`).join("");
  $("rangeValue").textContent=`${formatPrice(c.range)} 點`;
  $("centerValue").textContent=formatPrice(c.center);
  $("countValue").textContent=`上${c.pairs.length}／下${c.pairs.length}`;
  $("nearestValue").textContent=nearest?`${nearest.name} · ${formatPrice(nearest.price)}`:"未輸入現價";
  $("summaryCard").classList.remove("hidden"); $("resultCard").classList.remove("hidden");
}
function applyMode(next, persist=true) {
  mode=next; document.body.dataset.mode=mode;
  document.querySelectorAll(".mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  if(persist){settings.mode=mode;saveSettings();}
}
function saveSettings(){localStorage.setItem("fibo_nav_settings_v12",JSON.stringify(settings));}
function saveInputs(){if(settings.remember)localStorage.setItem("fibo_nav_inputs",JSON.stringify({high:$("highInput").value,low:$("lowInput").value,current:$("currentInput").value}));}
function loadInputs(){if(!settings.remember)return;try{const x=JSON.parse(localStorage.getItem("fibo_nav_inputs")||"{}");$("highInput").value=x.high||"";$("lowInput").value=x.low||"";$("currentInput").value=x.current||"";}catch{}}

function addLevelRow(level={ratio:1,label:"新增層",enabled:true}){
  const row=document.createElement("div");row.className="level-row";
  row.innerHTML=`<input class="level-enabled" type="checkbox" ${level.enabled?"checked":""} aria-label="啟用"><input class="level-ratio" type="number" min="0.0001" step="0.0001" value="${level.ratio}" aria-label="比例"><input class="level-label" type="text" value="${escapeHtml(level.label)}" aria-label="名稱"><button type="button" class="remove-btn">刪</button>`;
  row.querySelector(".remove-btn").onclick=()=>row.remove(); $("levelEditor").appendChild(row);
}
function openSettings(){
  $("presetNameInput").value=settings.name; $("rememberInput").checked=settings.remember; $("levelEditor").innerHTML=""; settings.levels.forEach(addLevelRow);
  document.querySelectorAll(".default-mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode===settings.mode)); $("settingsDialog").showModal();
}
document.querySelectorAll(".mode-btn").forEach(b=>b.onclick=()=>applyMode(b.dataset.mode));
document.querySelectorAll(".default-mode-btn").forEach(b=>b.onclick=()=>{document.querySelectorAll(".default-mode-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");});
$("calcBtn").onclick=calculate; $("settingsBtn").onclick=openSettings; $("addLevelBtn").onclick=()=>addLevelRow();
$("clearBtn").onclick=()=>{$("highInput").value="";$("lowInput").value="";$("currentInput").value="";$("summaryCard").classList.add("hidden");$("resultCard").classList.add("hidden");lastCalculation=null;localStorage.removeItem("fibo_nav_inputs");};
$("saveSettingsBtn").onclick=()=>{
  const levels=[...document.querySelectorAll(".level-row")].map((r,i)=>({enabled:r.querySelector(".level-enabled").checked,ratio:Number(r.querySelector(".level-ratio").value),label:r.querySelector(".level-label").value.trim()||`第${i+1}層`})).filter(x=>Number.isFinite(x.ratio)&&x.ratio>0).sort((a,b)=>a.ratio-b.ratio);
  if(!levels.length)return showToast("至少保留一組有效參數");
  settings={...settings,name:$("presetNameInput").value.trim()||"中心費波",remember:$("rememberInput").checked,mode:document.querySelector(".default-mode-btn.active")?.dataset.mode||"points",levels};saveSettings();applyMode(settings.mode,false);$("settingsDialog").close();showToast("設定已儲存");if(lastCalculation)calculate();
};
$("resetBtn").onclick=()=>{settings=clone(DEFAULT_SETTINGS);saveSettings();$("presetNameInput").value=settings.name;$("rememberInput").checked=settings.remember;$("levelEditor").innerHTML="";settings.levels.forEach(addLevelRow);document.querySelectorAll(".default-mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode===settings.mode));showToast("已恢復預設");};
$("copyBtn").onclick=async()=>{if(!lastCalculation)return;const c=lastCalculation;const lines=[...c.pairs].reverse().map(p=>`上${p.index}\t${p.up}`);lines.push(`多空\t${formatPrice(c.center)}`);c.pairs.forEach(p=>lines.push(`下${p.index}\t${p.down}`));try{await navigator.clipboard.writeText(lines.join("\n"));showToast("已複製全部點位");}catch{showToast("瀏覽器不允許複製");}};
applyMode(mode,false);loadInputs();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));
