
const PARAMS = [0.336, 0.544, 0.6916, 0.880];
const DEFAULT_WORKER = "https://taifex-proxy.kai095919.workers.dev";
const $ = id => document.getElementById(id);

const els = {
  refreshBtn:$("refreshBtn"), settingsBtn:$("settingsBtn"), settingsDialog:$("settingsDialog"),
  statusDot:$("statusDot"), statusText:$("statusText"), updatedAt:$("updatedAt"),
  sessionMeta:$("sessionMeta"), sourceBadge:$("sourceBadge"),
  highValue:$("highValue"), lowValue:$("lowValue"), rangeValue:$("rangeValue"), centerValue:$("centerValue"),
  pointsPage:$("pointsPage"), fullPage:$("fullPage"), pointsList:$("pointsList"), fullLevels:$("fullLevels"),
  fullHigh:$("fullHigh"), fullLow:$("fullLow"), fullRange:$("fullRange"), fullCenter:$("fullCenter"),
  autoModeBtn:$("autoModeBtn"), manualModeBtn:$("manualModeBtn"), manualInputs:$("manualInputs"),
  manualHigh:$("manualHigh"), manualLow:$("manualLow"), applyManualBtn:$("applyManualBtn"),
  themeSelect:$("themeSelect"), workerUrl:$("workerUrl"), saveSettingsBtn:$("saveSettingsBtn"),
  testWorkerBtn:$("testWorkerBtn"), workerResult:$("workerResult"), toast:$("toast")
};

let sourceMode = localStorage.getItem("fibo_source_mode") || "auto";
let viewMode = localStorage.getItem("fibo_view_mode") || "points";
let current = {high:null, low:null, date:"", session:"", source:""};

function num(v){
  const n = Number(String(v ?? "").replace(/,/g,"").trim());
  return Number.isFinite(n) ? n : null;
}
function fmt(v, decimals=1){
  if(!Number.isFinite(v)) return "--";
  const rounded = Math.round(v * 10**decimals) / 10**decimals;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString("en-US")
    : rounded.toLocaleString("en-US",{minimumFractionDigits:1,maximumFractionDigits:decimals});
}
function fmtPoint(v){ return Math.round(v).toLocaleString("en-US"); }
function showToast(msg){
  els.toast.textContent=msg; els.toast.classList.add("show");
  clearTimeout(showToast.t); showToast.t=setTimeout(()=>els.toast.classList.remove("show"),1500);
}
function setStatus(ok,text){
  els.statusDot.classList.remove("ok","err");
  els.statusDot.classList.add(ok?"ok":"err");
  els.statusText.textContent=text;
  els.updatedAt.textContent=new Date().toLocaleTimeString("zh-TW",{hour12:false});
}
function calcFibo(high,low){
  const range=high-low;
  const center=(high+low)/2;
  const upper=PARAMS.map((p,i)=>({idx:i+1,param:p,price:Math.round(center+range*p)}));
  const lower=PARAMS.map((p,i)=>({idx:i+1,param:p,price:Math.round(center-range*p)}));
  return {high,low,range,center,upper,lower};
}
function render(){
  const h=current.high, l=current.low;
  if(!Number.isFinite(h)||!Number.isFinite(l)||h<=l){
    ["highValue","lowValue","rangeValue","centerValue","fullHigh","fullLow","fullRange","fullCenter"].forEach(id=>$(id).textContent="--");
    els.pointsList.innerHTML='<div class="hint">等待 High / Low 資料。</div>';
    els.fullLevels.innerHTML='';
    return;
  }
  const f=calcFibo(h,l);
  els.highValue.textContent=fmtPoint(h);
  els.lowValue.textContent=fmtPoint(l);
  els.rangeValue.textContent=fmtPoint(f.range);
  els.centerValue.textContent=fmt(f.center,1);
  els.sessionMeta.textContent=current.date ? `${current.date} ${current.session||""}` : (sourceMode==="manual"?"手動資料":"自動讀取");
  els.sourceBadge.textContent=sourceMode==="auto"?"自動模式":"手動模式";

  els.fullHigh.textContent=fmtPoint(h);
  els.fullLow.textContent=fmtPoint(l);
  els.fullRange.textContent=fmtPoint(f.range);
  els.fullCenter.textContent=fmt(f.center,1);

  const rows=[];
  [...f.upper].reverse().forEach(item=>{
    rows.push(`<div class="point-row long"><div class="name">多 ${item.idx}</div><div class="price">${fmtPoint(item.price)}</div><div class="param">+R×${item.param}</div></div>`);
  });
  rows.push(`<div class="point-row center"><div class="name">多空中心</div><div class="price">${fmt(f.center,1)}</div><div class="param">(H+L)÷2</div></div>`);
  f.lower.forEach(item=>{
    rows.push(`<div class="point-row short"><div class="name">空 ${item.idx}</div><div class="price">${fmtPoint(item.price)}</div><div class="param">−R×${item.param}</div></div>`);
  });
  els.pointsList.innerHTML=rows.join("");

  const full=[];
  f.upper.forEach(item=>{
    full.push(`<div class="full-row"><span>多 ${item.idx}</span><strong>${fmtPoint(item.price)}</strong><small>Center + Range × ${item.param}</small></div>`);
  });
  full.push(`<div class="full-row"><span>中心</span><strong>${fmt(f.center,1)}</strong><small>(High + Low) ÷ 2</small></div>`);
  f.lower.forEach(item=>{
    full.push(`<div class="full-row"><span>空 ${item.idx}</span><strong>${fmtPoint(item.price)}</strong><small>Center − Range × ${item.param}</small></div>`);
  });
  els.fullLevels.innerHTML=full.join("");
}
function setView(mode){
  viewMode=mode;
  localStorage.setItem("fibo_view_mode",mode);
  document.querySelectorAll(".mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  els.pointsPage.classList.toggle("active",mode==="points");
  els.fullPage.classList.toggle("active",mode==="full");
}
function setSourceMode(mode){
  sourceMode=mode;
  localStorage.setItem("fibo_source_mode",mode);
  els.autoModeBtn.classList.toggle("active",mode==="auto");
  els.manualModeBtn.classList.toggle("active",mode==="manual");
  els.manualInputs.classList.toggle("hidden",mode!=="manual");
  els.sourceBadge.textContent=mode==="auto"?"自動模式":"手動模式";
  if(mode==="auto") loadAuto();
}
async function fetchWorker(){
  const url=(localStorage.getItem("fibo_worker_url")||DEFAULT_WORKER).trim();
  const res=await fetch(url,{cache:"no-store"});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const data=await res.json();
  if(!data?.success) throw new Error(data?.error||"讀取失敗");
  return data;
}
async function loadAuto(){
  setStatus(true,"讀取上一交易時段…");
  try{
    const data=await fetchWorker();
    const p=data.selectedPreviousSession;
    if(!p?.found) throw new Error("找不到上一交易時段資料");
    const h=num(p.high), l=num(p.low);
    if(!Number.isFinite(h)||!Number.isFinite(l)||h<=l) throw new Error("High / Low 無效");
    current={high:h,low:l,date:p.date||"",session:p.session||"",source:"TAIFEX"};
    setStatus(true,"資料已更新");
    render();
  }catch(err){
    console.error(err);
    setStatus(false,"自動資料讀取失敗");
    showToast("TAIFEX 尚未提供可用資料，可改用手動模式");
  }
}
function applyManual(){
  const h=num(els.manualHigh.value), l=num(els.manualLow.value);
  if(!Number.isFinite(h)||!Number.isFinite(l)){showToast("請輸入 High / Low");return;}
  if(h<=l){showToast("High 必須大於 Low");return;}
  current={high:h,low:l,date:"",session:"手動",source:"manual"};
  setStatus(true,"已套用手動資料");
  render();
  els.settingsDialog.close();
}
function applyTheme(theme){
  document.documentElement.dataset.theme=theme;
  localStorage.setItem("fibo_theme",theme);
  els.themeSelect.value=theme;
}
document.querySelectorAll(".mode-btn").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.mode)));
els.refreshBtn.addEventListener("click",()=>sourceMode==="auto"?loadAuto():render());
els.settingsBtn.addEventListener("click",()=>els.settingsDialog.showModal());
els.autoModeBtn.addEventListener("click",()=>setSourceMode("auto"));
els.manualModeBtn.addEventListener("click",()=>setSourceMode("manual"));
els.applyManualBtn.addEventListener("click",applyManual);
els.themeSelect.addEventListener("change",e=>applyTheme(e.target.value));
els.saveSettingsBtn.addEventListener("click",()=>{
  const url=els.workerUrl.value.trim();
  if(url) localStorage.setItem("fibo_worker_url",url);
  showToast("設定已儲存");
});
els.testWorkerBtn.addEventListener("click",async()=>{
  els.workerResult.textContent="測試中…";
  try{
    const d=await fetchWorker(), p=d.selectedPreviousSession;
    els.workerResult.textContent=p?.found?`成功：${p.date||""} ${p.session||""} H ${p.high} / L ${p.low}`:"連線成功，但無上一時段資料";
  }catch(err){els.workerResult.textContent=`失敗：${err.message}`;}
});

(function init(){
  applyTheme(localStorage.getItem("fibo_theme")||"blue");
  els.workerUrl.value=localStorage.getItem("fibo_worker_url")||DEFAULT_WORKER;
  setView(viewMode);
  els.autoModeBtn.classList.toggle("active",sourceMode==="auto");
  els.manualModeBtn.classList.toggle("active",sourceMode==="manual");
  els.manualInputs.classList.toggle("hidden",sourceMode!=="manual");
  render();
  if(sourceMode==="auto") loadAuto();
})();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
}
