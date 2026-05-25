import React, { useState, useEffect, useRef, useCallback } from "react";

/* ---- ตัวสำรองพื้นที่เก็บข้อมูล ----
   เมื่อรันใน Claude artifact จะมี window.storage ให้อยู่แล้ว
   แต่เมื่อรันในโปรเจกต์ Vite ของคุณเอง จะไม่มี — จึงใช้ localStorage แทน
   (หมายเหตุ: localStorage เก็บแยกตามเครื่อง/เบราว์เซอร์ ไม่ได้ใช้ร่วมกันทุกคน
    ถ้าต้องการประกาศที่ทุกคนเห็นร่วมกันจริง ต้องมีฐานข้อมูล/เซิร์ฟเวอร์กลาง) */
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: async (key) => { try { const v = localStorage.getItem(key); return v != null ? { key, value: v } : null; } catch (e) { return null; } },
    set: async (key, value) => { try { localStorage.setItem(key, value); } catch (e) {} return { key, value }; },
    delete: async (key) => { try { localStorage.removeItem(key); } catch (e) {} return { key, deleted: true }; },
    list: async (prefix = "") => { const keys = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefix)) keys.push(k); } } catch (e) {} return { keys }; },
  };
}

/* =========================================================================
   สมุดการบ้าน — Homework Notebook
   - บันทึกการบ้าน + แจ้งเตือนก่อนถึงกำหนดส่ง (ในเว็บ + แจ้งเตือนเบราว์เซอร์)
   - ตารางสอน (รายสัปดาห์)
   - บอร์ดประกาศ 4 หมวด + ลิงก์ที่มา (ข้อมูลใช้ร่วมกัน)
   - พี่เลี้ยง AI (Anthropic API ในอาร์ติแฟกต์ — ไม่ต้องใช้คีย์)
   ข้อมูลส่วนตัวเก็บผ่าน window.storage (การบ้าน/ตารางสอน/ตั้งค่า)
   ========================================================================= */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Mitr:wght@400;500;600&family=Anuphan:wght@400;500;600;700&family=Mali:wght@500&display=swap');

* { box-sizing: border-box; }
/* ---- reset default Vite/template styles that break layout ---- */
html, body { margin:0; padding:0; min-width:0; width:100%; }
body { display:block; place-items:initial; background:#F2EBDB; color:#2C2823; }
#root { max-width:none; width:100%; margin:0; padding:0; text-align:left; }
.app {
  width:100%;
  color-scheme:light;
  --paper:#F2EBDB; --paper-2:#FCF8EF; --paper-3:#FBF5E8;
  --ink:#2C2823; --ink-soft:#7A7060; --line:#E4D9C3;
  --primary:#1E6F5C; --primary-soft:#DCEAE3;
  --accent:#D2602A; --accent-soft:#F6E2D1;
  --shadow:0 1px 0 rgba(0,0,0,.02), 0 8px 22px -14px rgba(60,45,20,.45);
  --c-school:#2C5C8F; --c-council:#7A4FB0; --c-class:#2F8559; --c-teacher:#C0852A;
  font-family:'Anuphan',sans-serif; color:var(--ink);
  min-height:100vh; line-height:1.55;
  background:
    radial-gradient(120% 80% at 100% 0%, rgba(210,96,42,.06), transparent 60%),
    radial-gradient(110% 70% at 0% 100%, rgba(30,111,92,.07), transparent 55%),
    var(--paper);
}
.app *::-webkit-scrollbar { width:10px; height:10px; }
.app *::-webkit-scrollbar-thumb { background:var(--line); border-radius:8px; }
.wrap { max-width:940px; margin:0 auto; padding:0 18px 80px; }

/* ---- Masthead ---- */
.mast { padding:34px 0 18px; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.brand { display:flex; align-items:center; gap:14px; }
.mark { width:54px; height:54px; flex:0 0 auto; border-radius:14px; background:var(--ink);
  display:grid; place-items:center; box-shadow:var(--shadow); transform:rotate(-3deg); }
.brand h1 { font-family:'Mitr',sans-serif; font-weight:600; font-size:30px; margin:0; letter-spacing:.2px; }
.brand .tag { font-family:'Mali',cursive; color:var(--accent); font-size:15px; margin-top:-4px; }
.clock { text-align:right; color:var(--ink-soft); font-size:13.5px; }
.clock b { display:block; font-family:'Mitr',sans-serif; color:var(--ink); font-size:17px; font-weight:500; }

/* ---- Tabs ---- */
.tabs { display:flex; gap:6px; border-bottom:2px solid var(--line); margin:6px 0 22px; flex-wrap:wrap; }
.tab { appearance:none; border:0; background:transparent; cursor:pointer; font-family:'Mitr',sans-serif;
  font-size:15px; color:var(--ink-soft); padding:11px 14px 13px; position:relative; border-radius:10px 10px 0 0;
  display:flex; align-items:center; gap:7px; transition:.18s; }
.tab:hover { color:var(--ink); background:rgba(255,255,255,.5); }
.tab.on { color:var(--ink); background:var(--paper-2); box-shadow:0 -2px 10px -8px rgba(0,0,0,.4); }
.tab.on::after { content:""; position:absolute; left:8px; right:8px; bottom:-2px; height:3px; background:var(--accent); border-radius:3px; }
.tab .badge { background:var(--accent); color:#fff; font-family:'Anuphan'; font-size:11px; font-weight:700;
  min-width:18px; height:18px; padding:0 5px; border-radius:9px; display:grid; place-items:center; }

/* ---- Generic card / panel ---- */
.card { background:var(--paper-2); border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow); }
.panel { padding:18px; }
.btn { appearance:none; cursor:pointer; font-family:'Mitr',sans-serif; font-size:14px; border-radius:11px;
  padding:10px 16px; border:1px solid transparent; transition:.16s; display:inline-flex; align-items:center; gap:7px; }
.btn-primary { background:var(--primary); color:#fff; }
.btn-primary:hover { filter:brightness(1.06); transform:translateY(-1px); }
.btn-ghost { background:transparent; border-color:var(--line); color:var(--ink); }
.btn-ghost:hover { background:#fff; }
.btn-sm { padding:6px 11px; font-size:12.5px; border-radius:9px; }
.btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }

.field { display:flex; flex-direction:column; gap:5px; }
.field label { font-size:12.5px; color:var(--ink-soft); font-weight:600; }
input, textarea, select {
  font-family:'Anuphan',sans-serif; font-size:14.5px; color:var(--ink); width:100%;
  background:var(--paper-3); border:1px solid var(--line); border-radius:10px; padding:9px 12px; outline:none; transition:.15s;
}
input:focus, textarea:focus, select:focus { border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-soft); background:#fff; }
textarea { resize:vertical; min-height:62px; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }

/* ---- Stat strip ---- */
.stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
.stat { background:var(--paper-2); border:1px solid var(--line); border-radius:14px; padding:13px 15px; box-shadow:var(--shadow); }
.stat .n { font-family:'Mitr',sans-serif; font-size:26px; line-height:1; }
.stat .l { font-size:12.5px; color:var(--ink-soft); margin-top:5px; }
.stat.warn .n { color:var(--accent); }
.stat.good .n { color:var(--primary); }

/* ---- Reminder ---- */
.remind { border:1px solid #EFC9AE; background:linear-gradient(180deg,#FCEEDF,var(--paper-2)); border-radius:16px;
  padding:15px 17px; margin-bottom:18px; box-shadow:var(--shadow); }
.remind-h { display:flex; align-items:center; gap:9px; font-family:'Mitr',sans-serif; font-size:16px; }
.remind-h .pill { margin-left:auto; font-family:'Anuphan'; font-weight:700; font-size:12px; background:var(--accent); color:#fff; padding:2px 9px; border-radius:20px; }
.remind-list { display:flex; flex-direction:column; gap:7px; margin:11px 0 0; }
.ri { display:flex; align-items:center; gap:10px; background:var(--paper-3); border:1px solid var(--line); border-radius:10px; padding:8px 11px; }
.ri .ri-due { font-size:12px; font-weight:700; padding:2px 8px; border-radius:7px; white-space:nowrap; }
.ri .ri-due.over { background:#FBE3DA; color:#B23A12; } .ri .ri-due.today { background:#FCEBD3; color:#9A6708; } .ri .ri-due.soon { background:var(--primary-soft); color:var(--primary); }
.ri .ri-t { flex:1; min-width:0; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.remind-ctrl { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:13px; padding-top:12px; border-top:1px dashed var(--line); font-size:13px; color:var(--ink-soft); }
.remind-ctrl select { width:auto; padding:5px 8px; font-size:13px; }
.remind.calm { border-color:#BFD8CD; background:linear-gradient(180deg,#E7F1EC,var(--paper-2)); }

/* ---- Toolbar / chips ---- */
.toolbar { display:flex; gap:9px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
.chips { display:flex; gap:7px; flex-wrap:wrap; }
.chip { appearance:none; cursor:pointer; font-family:'Anuphan'; font-weight:600; font-size:13px; border-radius:20px;
  padding:6px 13px; border:1px solid var(--line); background:var(--paper-2); color:var(--ink-soft); transition:.15s; display:flex; align-items:center; gap:6px; }
.chip:hover { color:var(--ink); }
.chip.on { background:var(--ink); color:var(--paper-2); border-color:var(--ink); }
.dot { width:9px; height:9px; border-radius:50%; flex:0 0 auto; }
.spacer { flex:1; }

/* ---- Homework item ---- */
.hw { position:relative; display:flex; gap:13px; padding:15px 16px 15px 18px; align-items:flex-start; border-bottom:1px solid var(--line); }
.hw:last-child { border-bottom:0; }
.hw::before { content:""; position:absolute; left:0; top:12px; bottom:12px; width:4px; border-radius:4px; background:var(--bar,#ccc); }
.check { width:23px; height:23px; flex:0 0 auto; border-radius:50%; border:2px solid var(--line); background:#fff; cursor:pointer; display:grid; place-items:center; margin-top:2px; transition:.15s; }
.check:hover { border-color:var(--primary); }
.check.done { background:var(--primary); border-color:var(--primary); }
.hw-body { flex:1; min-width:0; }
.hw-title { font-family:'Mitr',sans-serif; font-size:16px; word-break:break-word; }
.hw.done .hw-title { text-decoration:line-through; color:var(--ink-soft); }
.hw-detail { font-size:13.5px; color:var(--ink-soft); margin-top:2px; word-break:break-word; white-space:pre-wrap; }
.hw-meta { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:8px; }
.subj { font-size:12px; font-weight:700; padding:3px 9px; border-radius:7px; color:#fff; }
.due { font-size:12.5px; font-weight:600; padding:3px 9px; border-radius:7px; background:var(--paper-3); border:1px solid var(--line); }
.due.over { background:#FBE3DA; color:#B23A12; border-color:#F0C4B4; }
.due.today, .due.soon { background:#FCEBD3; color:#9A6708; border-color:#F2D9AE; }
.due.done { background:var(--primary-soft); color:var(--primary); border-color:#BFD8CD; }
.pri { font-size:12px; font-weight:600; color:var(--ink-soft); display:flex; align-items:center; gap:5px; }
.x { margin-left:auto; appearance:none; border:0; background:transparent; color:var(--ink-soft); cursor:pointer; font-size:13px; padding:4px 6px; border-radius:8px; }
.x:hover { background:#FBE3DA; color:#B23A12; }

/* ---- Schedule ---- */
.sch-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:11px; }
.day { background:var(--paper-2); border:1px solid var(--line); border-radius:14px; overflow:hidden; box-shadow:var(--shadow); }
.day.today { border-color:var(--primary); }
.day-h { font-family:'Mitr',sans-serif; font-size:14.5px; padding:9px 12px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; }
.day.today .day-h { background:var(--primary); color:#fff; border-color:var(--primary); }
.day-h .n { font-size:11px; font-weight:400; opacity:.8; }
.day-b { padding:9px; display:flex; flex-direction:column; gap:8px; min-height:54px; }
.day-b .none { color:var(--ink-soft); font-size:12px; text-align:center; padding:8px 0; opacity:.7; }
.cls { position:relative; border-left:4px solid var(--bar,#ccc); background:var(--paper-3); border-radius:9px; padding:8px 24px 8px 10px; }
.cls.now { box-shadow:0 0 0 2px var(--accent); }
.cls .ct { font-size:11.5px; color:var(--ink-soft); font-weight:600; }
.cls .cs { font-family:'Mitr',sans-serif; font-size:13.5px; margin-top:1px; word-break:break-word; }
.cls .cm { font-size:11.5px; color:var(--ink-soft); margin-top:2px; word-break:break-word; }
.cls .nowtag { font-size:10px; font-weight:700; color:var(--accent); }
.cls .cx { position:absolute; top:5px; right:5px; appearance:none; border:0; background:transparent; color:var(--ink-soft); cursor:pointer; border-radius:6px; padding:2px 5px; font-size:14px; line-height:1; }
.cls .cx:hover { background:#FBE3DA; color:#B23A12; }

/* ---- Announcement ---- */
.ann { padding:0; overflow:hidden; margin-bottom:13px; }
.ann-top { height:6px; }
.ann-in { padding:15px 17px; }
.ann-head { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
.cat { font-size:12px; font-weight:700; color:#fff; padding:3px 10px; border-radius:20px; }
.pin { margin-left:auto; appearance:none; border:1px solid var(--line); background:var(--paper-3); cursor:pointer; border-radius:8px; padding:4px 9px; font-size:12px; color:var(--ink-soft); display:flex; gap:5px; align-items:center; }
.pin.on { background:var(--accent-soft); color:var(--accent); border-color:#EFC9AE; }
.ann h3 { font-family:'Mitr',sans-serif; font-size:18px; margin:9px 0 4px; }
.ann p { font-size:14.5px; white-space:pre-wrap; word-break:break-word; margin:0; }
.ann-foot { display:flex; gap:10px; align-items:center; margin-top:11px; font-size:12.5px; color:var(--ink-soft); flex-wrap:wrap; }
.avatar { width:25px; height:25px; border-radius:50%; display:grid; place-items:center; color:#fff; font-weight:700; font-size:12px; }
.src { color:var(--c-school); text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px; }
.src:hover { text-decoration:underline; }

/* ---- empty / hint ---- */
.empty { text-align:center; padding:46px 20px; color:var(--ink-soft); }
.empty .ic { opacity:.5; margin-bottom:8px; }
.empty p { margin:4px 0 0; font-size:14px; }
.hint { font-size:12.5px; color:var(--ink-soft); background:var(--paper-3); border:1px dashed var(--line); border-radius:11px; padding:10px 13px; display:flex; gap:9px; align-items:flex-start; margin-bottom:14px; }

/* ---- AI chat ---- */
.chat { display:flex; flex-direction:column; height:560px; overflow:hidden; padding:0; }
.chat-log { flex:1; overflow-y:auto; padding:18px; display:flex; flex-direction:column; gap:13px; }
.msg { max-width:82%; padding:11px 14px; border-radius:15px; font-size:14.5px; }
.msg.ai { align-self:flex-start; background:var(--paper-3); border:1px solid var(--line); border-bottom-left-radius:5px; }
.msg.me { align-self:flex-end; background:var(--primary); color:#fff; border-bottom-right-radius:5px; }
.msg b { font-weight:700; }
.typing { display:flex; gap:4px; align-items:center; }
.typing span { width:7px; height:7px; border-radius:50%; background:var(--ink-soft); animation:bl 1.2s infinite; }
.typing span:nth-child(2){ animation-delay:.2s; } .typing span:nth-child(3){ animation-delay:.4s; }
@keyframes bl { 0%,80%,100%{ opacity:.25; transform:translateY(0);} 40%{ opacity:1; transform:translateY(-3px);} }
.suggest { display:flex; gap:7px; flex-wrap:wrap; padding:0 14px 11px; }
.s-chip { cursor:pointer; font-size:12.5px; font-weight:600; background:var(--paper-2); border:1px solid var(--line); border-radius:18px; padding:6px 12px; color:var(--ink); transition:.15s; }
.s-chip:hover { background:#fff; border-color:var(--primary); color:var(--primary); }
.composer { display:flex; gap:9px; padding:13px 14px; border-top:1px solid var(--line); background:var(--paper-2); }
.composer textarea { min-height:0; height:44px; }

.fadein { animation:fi .35s ease both; }
@keyframes fi { from{ opacity:0; transform:translateY(7px);} to{ opacity:1; transform:none;} }
.foot { text-align:center; color:var(--ink-soft); font-size:12px; margin-top:26px; }

@media (max-width:680px){
  .stats { grid-template-columns:1fr 1fr; }
  .grid2,.grid3 { grid-template-columns:1fr; }
  .sch-grid { grid-template-columns:1fr; }
  .brand h1 { font-size:24px; } .clock { display:none; }
  .msg { max-width:90%; }
}
`;

/* ---------- constants & helpers ---------- */
const CATS = [
  { k: "school",  label: "โรงเรียน",       hex: "#2C5C8F" },
  { k: "council", label: "สภานักเรียน",     hex: "#7A4FB0" },
  { k: "class",   label: "คณะกรรมการห้อง", hex: "#2F8559" },
  { k: "teacher", label: "ครูที่ปรึกษา",    hex: "#C0852A" },
];
const catOf = (k) => CATS.find((c) => c.k === k) || CATS[0];

const DAYS = [
  { k: "mon", label: "จันทร์",   dow: 1 },
  { k: "tue", label: "อังคาร",   dow: 2 },
  { k: "wed", label: "พุธ",      dow: 3 },
  { k: "thu", label: "พฤหัสบดี", dow: 4 },
  { k: "fri", label: "ศุกร์",    dow: 5 },
];

const SUBJ_COLORS = ["#2C5C8F", "#D2602A", "#7A4FB0", "#2F8559", "#C0852A", "#B23A6B", "#3B7FA0", "#8A6D3B"];
const colorForSubject = (s) => {
  let h = 0; for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return SUBJ_COLORS[h % SUBJ_COLORS.length];
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayStr = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

const daysLeft = (due) => {
  if (!due) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(due + "T00:00:00");
  return Math.round((d - t) / 86400000);
};
function dueInfo(due, done) {
  if (done) return { label: "ส่งแล้ว", tone: "done" };
  const diff = daysLeft(due);
  if (diff === null) return { label: "ไม่กำหนดส่ง", tone: "" };
  if (diff < 0) return { label: `เลยกำหนด ${-diff} วัน`, tone: "over", diff };
  if (diff === 0) return { label: "ส่งวันนี้", tone: "today", diff };
  if (diff === 1) return { label: "ส่งพรุ่งนี้", tone: "soon", diff };
  if (diff <= 7) return { label: `อีก ${diff} วัน`, tone: "soon", diff };
  return { label: `อีก ${diff} วัน`, tone: "", diff };
}
const thaiDate = (iso) => iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "";
const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const fmtMsg = (t) => escapeHtml(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br/>");
const safeUrl = (u) => (/^https?:\/\//i.test((u || "").trim()) ? u.trim() : "");

const Ic = {
  book: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F2EBDB" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2z"/><path d="M20 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2z"/></svg>,
  plus: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  send: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>,
  bell: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  bigCheck: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  mega: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
  cal: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
};

/* =====================================================================
   APP
   ===================================================================== */
export default function App() {
  const [tab, setTab] = useState("homework");
  const [hw, setHw] = useState([]);
  const [ann, setAnn] = useState([]);
  const [sch, setSch] = useState([]);
  const [leadDays, setLeadDays] = useState(3);
  const [notifOn, setNotifOn] = useState(false);
  const [ready, setReady] = useState(false);
  const notified = useRef(false);

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("hw:list"); if (r?.value) setHw(JSON.parse(r.value)); } catch (e) {}
      try { const r = await window.storage.get("ann:list", true); if (r?.value) setAnn(JSON.parse(r.value)); } catch (e) {}
      try { const r = await window.storage.get("sch:list"); if (r?.value) setSch(JSON.parse(r.value)); } catch (e) {}
      try { const r = await window.storage.get("prefs:app"); if (r?.value) { const p = JSON.parse(r.value); setLeadDays(p.leadDays ?? 3); setNotifOn(!!p.notifOn); } } catch (e) {}
      setReady(true);
    })();
  }, []);

  const saveHw = useCallback(async (next) => { setHw(next); try { await window.storage.set("hw:list", JSON.stringify(next)); } catch (e) {} }, []);
  const saveAnn = useCallback(async (next) => { setAnn(next); try { await window.storage.set("ann:list", JSON.stringify(next), true); } catch (e) {} }, []);
  const saveSch = useCallback(async (next) => { setSch(next); try { await window.storage.set("sch:list", JSON.stringify(next)); } catch (e) {} }, []);
  const savePrefs = useCallback(async (p) => { setLeadDays(p.leadDays); setNotifOn(p.notifOn); try { await window.storage.set("prefs:app", JSON.stringify(p)); } catch (e) {} }, []);

  const enableNotif = useCallback(async () => {
    try {
      if (typeof Notification === "undefined") { window.alert("เบราว์เซอร์/หน้านี้ไม่รองรับการแจ้งเตือนของระบบ แต่ยังมีการแจ้งเตือนในหน้าเว็บให้อยู่ครับ"); return; }
      const p = await Notification.requestPermission();
      const on = p === "granted";
      savePrefs({ leadDays, notifOn: on });
      if (on) { try { new Notification("สมุดการบ้าน 📚", { body: "เปิดการแจ้งเตือนแล้ว ✅ เมื่อมีการบ้านใกล้กำหนด เราจะเตือนให้ตอนเปิดเว็บ" }); } catch (e) {} }
      else window.alert("เบราว์เซอร์ยังไม่ได้อนุญาตให้แจ้งเตือน ลองเปิดสิทธิ์ในการตั้งค่าเบราว์เซอร์อีกครั้งครับ");
    } catch (e) {}
  }, [leadDays, savePrefs]);

  /* fire one browser notification on load if there are urgent items */
  useEffect(() => {
    if (!ready || notified.current || !notifOn) return;
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const u = hw.filter((h) => !h.done && h.due).map((h) => daysLeft(h.due)).filter((d) => d !== null && d <= leadDays);
      if (u.length) { notified.current = true; new Notification("สมุดการบ้าน 📚", { body: `มีการบ้าน ${u.length} รายการที่ใกล้/เลยกำหนดส่ง อย่าลืมทำนะครับ!` }); }
    } catch (e) {}
  }, [ready, notifOn, hw, leadDays]);

  const pending = hw.filter((h) => !h.done).length;
  const urgentCount = hw.filter((h) => !h.done && h.due).filter((h) => { const d = daysLeft(h.due); return d !== null && d <= leadDays; }).length;

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="wrap">
        <Masthead />
        <div className="tabs">
          <button className={`tab ${tab === "homework" ? "on" : ""}`} onClick={() => setTab("homework")}>
            📓 บันทึกการบ้าน {urgentCount > 0 ? <span className="badge">{urgentCount}</span> : pending > 0 && <span className="badge" style={{ background: "var(--ink-soft)" }}>{pending}</span>}
          </button>
          <button className={`tab ${tab === "schedule" ? "on" : ""}`} onClick={() => setTab("schedule")}>📅 ตารางสอน</button>
          <button className={`tab ${tab === "ann" ? "on" : ""}`} onClick={() => setTab("ann")}>📣 ประกาศ {ann.length > 0 && <span className="badge">{ann.length}</span>}</button>
          <button className={`tab ${tab === "ai" ? "on" : ""}`} onClick={() => setTab("ai")}>✨ พี่เลี้ยง AI</button>
        </div>

        {!ready ? (
          <div className="empty">กำลังโหลด…</div>
        ) : tab === "homework" ? (
          <Homework hw={hw} save={saveHw} leadDays={leadDays} setLeadDays={(d) => savePrefs({ leadDays: d, notifOn })} notifOn={notifOn} enableNotif={enableNotif} />
        ) : tab === "schedule" ? (
          <Schedule sch={sch} save={saveSch} />
        ) : tab === "ann" ? (
          <Announcements ann={ann} save={saveAnn} />
        ) : (
          <Assistant hw={hw} sch={sch} />
        )}

        <div className="foot">สมุดการบ้าน · การบ้าน/ตารางสอนเก็บเฉพาะของคุณ · ประกาศใช้ร่วมกันทุกคน</div>
      </div>
    </div>
  );
}

/* ---------- Masthead ---------- */
function Masthead() {
  const now = new Date();
  return (
    <div className="mast">
      <div className="brand">
        <div className="mark">{Ic.book}</div>
        <div>
          <h1>สมุดการบ้าน</h1>
          <div className="tag">จดให้ครบ · ส่งให้ทัน · มี AI ช่วยคิด</div>
        </div>
      </div>
      <div className="clock">
        <b>{now.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}</b>
        ปีการศึกษา {now.getFullYear() + 543}
      </div>
    </div>
  );
}

/* =====================================================================
   REMINDER (inside Homework)
   ===================================================================== */
function Reminder({ hw, leadDays, setLeadDays, notifOn, enableNotif, onDone }) {
  const items = hw
    .filter((h) => !h.done && h.due)
    .map((h) => ({ h, d: daysLeft(h.due) }))
    .filter((x) => x.d !== null && x.d <= leadDays)
    .sort((a, b) => a.d - b.d);

  const tone = (d) => (d < 0 ? "over" : d === 0 ? "today" : "soon");
  const label = (d) => (d < 0 ? `เลย ${-d} วัน` : d === 0 ? "วันนี้" : d === 1 ? "พรุ่งนี้" : `อีก ${d} วัน`);

  return (
    <div className={`remind ${items.length ? "" : "calm"} fadein`}>
      <div className="remind-h">
        {Ic.bell}
        {items.length ? <span>แจ้งเตือน · มีการบ้านใกล้ถึงกำหนดส่ง</span> : <span>เยี่ยมมาก! ไม่มีการบ้านใกล้กำหนดในช่วงนี้ 🎉</span>}
        {items.length > 0 && <span className="pill">{items.length}</span>}
      </div>

      {items.length > 0 && (
        <div className="remind-list">
          {items.map(({ h, d }) => (
            <div className="ri" key={h.id}>
              <span className={`ri-due ${tone(d)}`}>{label(d)}</span>
              <span className="ri-t"><b>{h.subject}</b> · {h.title}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onDone(h.id)}>เสร็จแล้ว</button>
            </div>
          ))}
        </div>
      )}

      <div className="remind-ctrl">
        <span>เตือนล่วงหน้า</span>
        <select value={leadDays} onChange={(e) => setLeadDays(Number(e.target.value))}>
          <option value={1}>1 วัน</option><option value={2}>2 วัน</option><option value={3}>3 วัน</option><option value={5}>5 วัน</option><option value={7}>7 วัน</option>
        </select>
        <span className="spacer" />
        {notifOn
          ? <span style={{ color: "var(--primary)", fontWeight: 600 }}>🔔 แจ้งเตือนเบราว์เซอร์: เปิดอยู่</span>
          : <button className="btn btn-ghost btn-sm" onClick={enableNotif}>{Ic.bell} เปิดแจ้งเตือนเบราว์เซอร์</button>}
      </div>
    </div>
  );
}

/* =====================================================================
   HOMEWORK
   ===================================================================== */
function Homework({ hw, save, leadDays, setLeadDays, notifOn, enableNotif }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [f, setF] = useState({ subject: "", title: "", detail: "", due: "", priority: "กลาง" });

  const add = () => {
    if (!f.title.trim()) return;
    const item = { id: uid(), ...f, subject: f.subject.trim() || "ทั่วไป", done: false, createdAt: Date.now() };
    save([item, ...hw]);
    setF({ subject: "", title: "", detail: "", due: "", priority: "กลาง" });
    setOpen(false);
  };
  const toggle = (id) => save(hw.map((h) => (h.id === id ? { ...h, done: !h.done } : h)));
  const remove = (id) => save(hw.filter((h) => h.id !== id));

  const sorted = [...hw].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1; if (b.due) return 1;
    return b.createdAt - a.createdAt;
  });
  const list = sorted.filter((h) => (filter === "pending" ? !h.done : filter === "done" ? h.done : true));

  const total = hw.length;
  const done = hw.filter((h) => h.done).length;
  const overdue = hw.filter((h) => !h.done && dueInfo(h.due, false).tone === "over").length;
  const soon = hw.filter((h) => !h.done && ["today", "soon"].includes(dueInfo(h.due, false).tone)).length;

  return (
    <div className="fadein">
      <Reminder hw={hw} leadDays={leadDays} setLeadDays={setLeadDays} notifOn={notifOn} enableNotif={enableNotif} onDone={toggle} />

      <div className="stats">
        <div className="stat"><div className="n">{total}</div><div className="l">ทั้งหมด</div></div>
        <div className="stat good"><div className="n">{done}</div><div className="l">ส่งแล้ว</div></div>
        <div className="stat warn"><div className="n">{soon}</div><div className="l">ใกล้ถึงกำหนด</div></div>
        <div className="stat warn"><div className="n">{overdue}</div><div className="l">เลยกำหนด</div></div>
      </div>

      <div className="toolbar">
        <div className="chips">
          {[["all", "ทั้งหมด"], ["pending", "ยังไม่เสร็จ"], ["done", "เสร็จแล้ว"]].map(([k, l]) => (
            <button key={k} className={`chip ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setOpen((o) => !o)}>{Ic.plus} เพิ่มการบ้าน</button>
      </div>

      {open && (
        <div className="card panel fadein" style={{ marginBottom: 16 }}>
          <div className="grid2" style={{ marginBottom: 12 }}>
            <div className="field"><label>วิชา</label>
              <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="เช่น คณิตศาสตร์, ภาษาไทย" /></div>
            <div className="field"><label>ชื่อการบ้าน *</label>
              <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="เช่น แบบฝึกหัดบทที่ 4 ข้อ 1–10" /></div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>รายละเอียด</label>
            <textarea value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} placeholder="โน้ตเพิ่มเติม เช่น ส่งเป็นเล่ม / ทำเป็นกลุ่ม" /></div>
          <div className="grid2" style={{ marginBottom: 14 }}>
            <div className="field"><label>กำหนดส่ง</label>
              <input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} min={todayStr()} /></div>
            <div className="field"><label>ความสำคัญ</label>
              <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
                <option>สูง</option><option>กลาง</option><option>ต่ำ</option>
              </select></div>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button className="btn btn-primary" onClick={add}>บันทึก</button>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
          </div>
        </div>
      )}

      <div className="card">
        {list.length === 0 ? (
          <div className="empty"><div className="ic">{Ic.bigCheck}</div>
            <p>{hw.length === 0 ? "ยังไม่มีการบ้าน — กด “เพิ่มการบ้าน” เพื่อเริ่มจดได้เลย" : "ไม่มีรายการในหมวดนี้"}</p></div>
        ) : (
          list.map((h) => {
            const di = dueInfo(h.due, h.done);
            const bar = colorForSubject(h.subject);
            return (
              <div key={h.id} className={`hw ${h.done ? "done" : ""}`} style={{ ["--bar"]: bar }}>
                <div className={`check ${h.done ? "done" : ""}`} onClick={() => toggle(h.id)} role="button" aria-label="ทำเครื่องหมายเสร็จ">
                  {h.done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                </div>
                <div className="hw-body">
                  <div className="hw-title">{h.title}</div>
                  {h.detail && <div className="hw-detail">{h.detail}</div>}
                  <div className="hw-meta">
                    <span className="subj" style={{ background: bar }}>{h.subject}</span>
                    <span className={`due ${di.tone}`}>{di.label}{h.due ? ` · ${thaiDate(h.due)}` : ""}</span>
                    <span className="pri"><span className="dot" style={{ background: h.priority === "สูง" ? "#D2602A" : h.priority === "กลาง" ? "#C0852A" : "#2F8559" }} />{h.priority}</span>
                    <button className="x" onClick={() => remove(h.id)}>ลบ</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   SCHEDULE  (weekly timetable, personal)
   ===================================================================== */
function Schedule({ sch, save }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ day: "mon", start: "08:30", end: "09:20", subject: "", teacher: "", room: "" });

  const add = () => {
    if (!f.subject.trim() || !f.start || !f.end) return;
    save([...sch, { id: uid(), ...f, subject: f.subject.trim() }]);
    setF({ ...f, subject: "", teacher: "", room: "" });
    setOpen(false);
  };
  const remove = (id) => save(sch.filter((c) => c.id !== id));

  const now = new Date();
  const dow = now.getDay();
  const hhmm = now.toTimeString().slice(0, 5);

  return (
    <div className="fadein">
      <div className="hint"><span>📅</span><span>ใส่ตารางเรียนรายสัปดาห์ของคุณ ระบบจะ <b>ไฮไลต์วันนี้</b> และ <b>คาบที่กำลังเรียนอยู่</b> ให้อัตโนมัติ — ข้อมูลนี้เก็บเฉพาะของคุณ</span></div>

      <div className="toolbar">
        <div style={{ fontFamily: "'Mitr',sans-serif", fontSize: 18 }}>ตารางสอนรายสัปดาห์</div>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setOpen((o) => !o)}>{Ic.plus} เพิ่มคาบเรียน</button>
      </div>

      {open && (
        <div className="card panel fadein" style={{ marginBottom: 16 }}>
          <div className="grid3" style={{ marginBottom: 12 }}>
            <div className="field"><label>วัน</label>
              <select value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })}>
                {DAYS.map((d) => <option key={d.k} value={d.k}>{d.label}</option>)}
              </select></div>
            <div className="field"><label>เริ่ม</label>
              <input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
            <div className="field"><label>เลิก</label>
              <input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          </div>
          <div className="grid3" style={{ marginBottom: 14 }}>
            <div className="field"><label>วิชา *</label>
              <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="เช่น คณิตศาสตร์" /></div>
            <div className="field"><label>ครูผู้สอน</label>
              <input value={f.teacher} onChange={(e) => setF({ ...f, teacher: e.target.value })} placeholder="เช่น ครูสมชาย" /></div>
            <div className="field"><label>ห้อง</label>
              <input value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} placeholder="เช่น 314" /></div>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button className="btn btn-primary" onClick={add}>เพิ่มลงตาราง</button>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
          </div>
        </div>
      )}

      {sch.length === 0 ? (
        <div className="card"><div className="empty"><div className="ic">{Ic.cal}</div>
          <p>ยังไม่มีตารางสอน — กด “เพิ่มคาบเรียน” เพื่อสร้างตารางของคุณ</p></div></div>
      ) : (
        <div className="sch-grid">
          {DAYS.map((d) => {
            const isToday = dow === d.dow;
            const classes = sch.filter((c) => c.day === d.k).sort((a, b) => a.start.localeCompare(b.start));
            return (
              <div key={d.k} className={`day ${isToday ? "today" : ""}`}>
                <div className="day-h"><span>{d.label}</span>{isToday && <span className="n">วันนี้</span>}</div>
                <div className="day-b">
                  {classes.length === 0 ? <div className="none">— ว่าง —</div> : classes.map((c) => {
                    const isNow = isToday && hhmm >= c.start && hhmm < c.end;
                    return (
                      <div key={c.id} className={`cls ${isNow ? "now" : ""}`} style={{ ["--bar"]: colorForSubject(c.subject) }}>
                        <button className="cx" onClick={() => remove(c.id)} aria-label="ลบ">×</button>
                        <div className="ct">{c.start}–{c.end} {isNow && <span className="nowtag">● กำลังเรียน</span>}</div>
                        <div className="cs">{c.subject}</div>
                        {(c.teacher || c.room) && <div className="cm">{[c.teacher, c.room && `ห้อง ${c.room}`].filter(Boolean).join(" · ")}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   ANNOUNCEMENTS  (shared storage) + source link
   ===================================================================== */
function Announcements({ ann, save }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [f, setF] = useState({ cat: "school", title: "", body: "", author: "", link: "" });

  const post = () => {
    if (!f.title.trim() || !f.body.trim()) return;
    const item = { id: uid(), cat: f.cat, title: f.title.trim(), body: f.body.trim(),
      author: f.author.trim() || "ไม่ระบุชื่อ", link: safeUrl(f.link), date: Date.now(), pinned: false };
    save([item, ...ann]);
    setF({ cat: f.cat, title: "", body: "", author: f.author, link: "" });
    setOpen(false);
  };
  const pin = (id) => save(ann.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)));
  const remove = (id) => { if (window.confirm("ลบประกาศนี้? (ทุกคนจะไม่เห็นอีก)")) save(ann.filter((a) => a.id !== id)); };

  const list = [...ann]
    .filter((a) => (filter === "all" ? true : a.cat === filter))
    .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.date - a.date));

  return (
    <div className="fadein">
      <div className="hint"><span>ℹ️</span>
        <span>ประกาศเป็นข้อมูล <b>ใช้ร่วมกัน</b> — ทุกคนที่เปิดเว็บนี้เห็นและโพสต์ได้ เหมาะให้ครู/สภาฯ/กรรมการห้องลงข่าว
        เห็นประกาศจาก Facebook ของโรงเรียน? พิมพ์สรุปลงที่นี่แล้ว <b>วางลิงก์โพสต์</b> ในช่อง “ลิงก์ที่มา” เพื่อนจะกดไปอ่านต้นฉบับต่อได้</span></div>

      <div className="toolbar">
        <div className="chips">
          <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>ทั้งหมด</button>
          {CATS.map((c) => (
            <button key={c.k} className={`chip ${filter === c.k ? "on" : ""}`} onClick={() => setFilter(c.k)}>
              <span className="dot" style={{ background: c.hex }} />{c.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setOpen((o) => !o)}>{Ic.plus} ลงประกาศ</button>
      </div>

      {open && (
        <div className="card panel fadein" style={{ marginBottom: 16 }}>
          <div className="grid2" style={{ marginBottom: 12 }}>
            <div className="field"><label>ประเภทผู้ประกาศ</label>
              <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>
                {CATS.map((c) => <option key={c.k} value={c.k}>{c.label}</option>)}
              </select></div>
            <div className="field"><label>ชื่อผู้ประกาศ</label>
              <input value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} placeholder="เช่น ครูสมศรี / สภานักเรียน / ห้อง ม.5/2" /></div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>หัวข้อ *</label>
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="เช่น งดการเรียนการสอนวันศุกร์" /></div>
          <div className="field" style={{ marginBottom: 12 }}><label>เนื้อหา *</label>
            <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} style={{ minHeight: 92 }} placeholder="รายละเอียดประกาศ…" /></div>
          <div className="field" style={{ marginBottom: 14 }}><label>ลิงก์ที่มา (ไม่บังคับ)</label>
            <input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="วางลิงก์โพสต์ Facebook ของโรงเรียน เช่น https://www.facebook.com/..." /></div>
          <div style={{ display: "flex", gap: 9 }}>
            <button className="btn btn-primary" onClick={post}>เผยแพร่ประกาศ</button>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card"><div className="empty"><div className="ic">{Ic.mega}</div><p>ยังไม่มีประกาศในหมวดนี้</p></div></div>
      ) : (
        list.map((a) => {
          const c = catOf(a.cat);
          return (
            <div key={a.id} className="card ann fadein">
              <div className="ann-top" style={{ background: c.hex }} />
              <div className="ann-in">
                <div className="ann-head">
                  <span className="cat" style={{ background: c.hex }}>{c.label}</span>
                  {a.pinned && <span className="pri" style={{ color: "var(--accent)" }}>📌 ปักหมุด</span>}
                  <button className={`pin ${a.pinned ? "on" : ""}`} onClick={() => pin(a.id)}>{a.pinned ? "เลิกปักหมุด" : "ปักหมุด"}</button>
                  <button className="x" onClick={() => remove(a.id)}>ลบ</button>
                </div>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
                <div className="ann-foot">
                  <span className="avatar" style={{ background: c.hex }}>{(a.author || "?").slice(0, 1)}</span>
                  <span><b style={{ color: "var(--ink)" }}>{a.author}</b></span>
                  <span>· {new Date(a.date).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  {a.link && <a className="src" href={a.link} target="_blank" rel="noopener noreferrer">🔗 ดูโพสต์ต้นฉบับ</a>}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* =====================================================================
   AI ASSISTANT  (Anthropic API — no key needed in artifact)
   ===================================================================== */
const SUGGEST = [
  "สรุปการบ้านที่ต้องส่งสัปดาห์นี้",
  "ช่วยจัดลำดับว่าควรทำอันไหนก่อน",
  "วางแผนแบ่งเวลาทำการบ้าน 3 วันนี้",
  "พรุ่งนี้เรียนวิชาอะไรบ้าง",
];

function Assistant({ hw, sch }) {
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "สวัสดีครับ ผมเป็น **พี่เลี้ยง AI** ของสมุดการบ้าน 📚\nผมเห็นทั้งรายการการบ้านและตารางสอนของคุณ ถามได้เลยว่าควรทำอะไรก่อน วางแผนเวลายังไง พรุ่งนี้เรียนอะไร หรือให้ช่วยอธิบายเนื้อหาบทเรียนก็ได้ครับ" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [msgs, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const history = [...msgs, { role: "user", content: q }];
    setMsgs(history); setInput(""); setBusy(true);

    const hwCtx = hw.length
      ? hw.map((h) => `- [${h.done ? "ส่งแล้ว" : "ค้าง"}] ${h.subject}: ${h.title}${h.due ? ` (กำหนดส่ง ${h.due})` : ""} | ความสำคัญ ${h.priority}${h.detail ? ` | ${h.detail}` : ""}`).join("\n")
      : "(ยังไม่มีการบ้านในระบบ)";
    const schCtx = sch.length
      ? DAYS.map((d) => { const cs = sch.filter((c) => c.day === d.k).sort((a, b) => a.start.localeCompare(b.start)); return cs.length ? `${d.label}: ${cs.map((c) => `${c.start}-${c.end} ${c.subject}${c.room ? ` (ห้อง ${c.room})` : ""}`).join(", ")}` : null; }).filter(Boolean).join("\n")
      : "(ยังไม่มีตารางสอน)";

    const system =
      `คุณคือ "พี่เลี้ยง AI" ผู้ช่วยในเว็บบันทึกการบ้านสำหรับนักเรียนไทย ` +
      `ตอบเป็นภาษาไทยที่เป็นกันเองแต่สุภาพ กระชับ ใช้บูลเล็ตหรือขั้นตอนเมื่อช่วยให้อ่านง่าย ` +
      `เมื่อผู้ใช้ถามเรื่องการบ้านหรือตารางเรียน ให้อ้างอิงข้อมูลจริงด้านล่าง เรียงตามกำหนดส่งและความสำคัญ ` +
      `ช่วยอธิบายบทเรียน ติว วางแผนเวลา และให้กำลังใจได้ แต่ไม่ทำข้อสอบหรือการบ้านที่ต้องส่งให้ทั้งหมดแทน — ให้แนวทาง ตัวอย่าง และวิธีคิดแทน\n\n` +
      `วันนี้คือ ${new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\n` +
      `รายการการบ้านปัจจุบัน:\n${hwCtx}\n\nตารางสอนรายสัปดาห์:\n${schCtx}`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "request failed");
      const txt = (data.text || "").trim();
      setMsgs((m) => [...m, { role: "assistant", content: txt || "ขออภัยครับ ยังตอบไม่ได้ในตอนนี้ ลองถามใหม่อีกครั้งนะครับ" }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: "เชื่อมต่อผู้ช่วยไม่สำเร็จ — ตรวจว่าเซิร์ฟเวอร์ backend (server.mjs) รันอยู่ และตั้งค่า GEMINI_API_KEY ใน .env แล้ว 🙏" }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="card chat fadein">
      <div className="chat-log" ref={logRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "me" : "ai"}`} dangerouslySetInnerHTML={{ __html: fmtMsg(m.content) }} />
        ))}
        {busy && <div className="msg ai"><div className="typing"><span /><span /><span /></div></div>}
      </div>
      {msgs.length <= 1 && (
        <div className="suggest">
          {SUGGEST.map((s) => <button key={s} className="s-chip" onClick={() => send(s)}>{s}</button>)}
        </div>
      )}
      <div className="composer">
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="พิมพ์คำถาม… (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)" />
        <button className="btn btn-primary" onClick={() => send()} disabled={busy || !input.trim()}>{Ic.send} ส่ง</button>
      </div>
    </div>
  );
}
