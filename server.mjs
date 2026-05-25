// server.mjs — พร็อกซีเล็ก ๆ สำหรับเรียก Gemini โดยเก็บคีย์ไว้ฝั่งเซิร์ฟเวอร์
// รันด้วย:  node server.mjs   (ต้องมี Node.js 18 ขึ้นไป)
// ติดตั้งครั้งแรก:  npm i express dotenv

import express from "express";
import "dotenv/config";

const app = express();
app.use(express.json({ limit: "1mb" }));

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const PORT = process.env.PORT || 5173

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
  console.log(`✅ AI proxy พร้อมใช้งานที่ http://localhost:${PORT}`);
  if (!KEY) console.warn("⚠️  ยังไม่พบ GEMINI_API_KEY — สร้างไฟล์ .env แล้วใส่คีย์ก่อนนะครับ");
});
