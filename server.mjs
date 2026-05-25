// server.mjs — พร็อกซีเล็ก ๆ สำหรับเรียก Gemini โดยเก็บคีย์ไว้ฝั่งเซิร์ฟเวอร์
// รันด้วย:  node server.mjs   (ต้องมี Node.js 18 ขึ้นไป)
// ติดตั้งครั้งแรก:  npm i express dotenv

import express from "express";
import "dotenv/config";
import fs from "fs";

const app = express();
app.use(express.json({ limit: "2mb" }));

/* ---------- ที่เก็บข้อมูลกลาง (ไฟล์ data.json) ----------
   เก็บข้อมูลทุกอย่างไว้บนเซิร์ฟเวอร์ ทุกคนที่ต่อเข้าเซิร์ฟเวอร์นี้
   จะอ่าน/เขียนข้อมูลชุดเดียวกัน (การบ้าน/ตารางสอน/ประกาศ) */
const DATA_FILE = "./data.json";
function readStore() { try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch (e) { return {}; } }
function writeStore(obj) { try { fs.writeFileSync(DATA_FILE, JSON.stringify(obj)); } catch (e) { console.error("เขียน data.json ไม่สำเร็จ:", e); } }

app.get("/api/store", (req, res) => {
  const key = String(req.query.key || "");
  const store = readStore();
  res.json({ key, value: key in store ? store[key] : null });
});

app.post("/api/store", (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: "missing key" });
  const store = readStore();
  store[key] = value;
  writeStore(store);
  res.json({ key, value });
});

app.delete("/api/store", (req, res) => {
  const key = String(req.query.key || "");
  const store = readStore();
  delete store[key];
  writeStore(store);
  res.json({ key, deleted: true });
});

app.get("/api/store/list", (req, res) => {
  const prefix = String(req.query.prefix || "");
  const store = readStore();
  res.json({ keys: Object.keys(store).filter((k) => k.startsWith(prefix)) });
});

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PORT = process.env.PORT || 8787;

app.post("/api/chat", async (req, res) => {
  if (!KEY) {
    return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในไฟล์ .env" });
  }
  try {
    const { system, messages } = req.body || {};

    // แปลงรูปแบบข้อความให้ตรงกับ Gemini (assistant -> model)
    const contents = (messages || []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "") }],
    }));

    const body = {
      contents,
      generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
    };
    if (system) body.system_instruction = { parts: [{ text: system }] };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify(body),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("Gemini error:", JSON.stringify(data));
      return res.status(r.status).json({ error: data?.error?.message || "Gemini error" });
    }

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .trim();

    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ เซิร์ฟเวอร์พร้อมใช้งานที่ http://localhost:${PORT}`);
  console.log(`   - ที่เก็บข้อมูลกลาง: /api/store (เก็บลงไฟล์ data.json)`);
  console.log(`   - พี่เลี้ยง AI: ปิดปรับปรุงชั่วคราว (หน้าเว็บแสดงสถานะนี้อยู่)`);
});
