# สมุดการบ้าน — วิธีนำขึ้น Vercel

เว็บบันทึกการบ้าน + ตารางสอน + ประกาศ ที่ข้อมูล **ใช้ร่วมกันทุกคน** ผ่านฐานข้อมูลกลาง (Upstash Redis)
พี่เลี้ยง AI: ปิดปรับปรุงชั่วคราว

## โครงไฟล์
```
homework-app/
├── api/
│   └── store.js          ← ฟังก์ชันเก็บข้อมูลกลาง (Vercel Function)
├── src/
│   ├── HomeworkApp.jsx    ← หน้าเว็บหลัก
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── .gitignore
```

## ขั้นตอน (ทำใน VS Code)

### 1. เอาไฟล์เข้าโปรเจกต์
วางไฟล์ทั้งหมดนี้ในโฟลเดอร์โปรเจกต์ของคุณ (ทับของเดิม) แล้วเปิดใน VS Code

### 2. ติดตั้งแพ็กเกจ
เปิด Terminal ใน VS Code (เมนู Terminal → New Terminal) แล้วพิมพ์:
```
npm install
```

### 3. ขึ้น GitHub
```
git add .
git commit -m "homework app: shared storage + AI maintenance"
git push
```
(ถ้ายังไม่เคยตั้ง remote: สร้าง repo ใน GitHub ก่อน แล้วทำตามคำสั่งที่ GitHub แสดง)

### 4. เชื่อม Vercel กับ repo
- เข้า vercel.com → Add New → Project → เลือก repo นี้จาก GitHub
- Framework Preset: เลือก **Vite** (ปกติ Vercel ตรวจให้อัตโนมัติ)
- ยังไม่ต้องกด Deploy ค้างไว้ก่อน หรือ Deploy ไปก่อนก็ได้ (ตอนนี้ AI ปิดอยู่ ส่วนเก็บข้อมูลจะยังไม่ทำงานจนกว่าจะทำข้อ 5)

### 5. เพิ่มฐานข้อมูล (สำคัญ — ทำให้ข้อมูลใช้ร่วมกันได้จริง)
- ใน Vercel → เปิดโปรเจกต์ → แท็บ **Storage** → **Create Database**
- เลือก **Upstash Redis** (จาก Marketplace) → ตั้งชื่อ → Create
- กด **Connect** เชื่อมเข้ากับโปรเจกต์นี้
- Vercel จะใส่ค่า `KV_REST_API_URL` และ `KV_REST_API_TOKEN` ให้อัตโนมัติ ไม่ต้องก็อปเอง

### 6. Deploy ใหม่
หลังเชื่อมฐานข้อมูลแล้ว ไปแท็บ **Deployments** → กด **Redeploy** (หรือ push โค้ดใหม่ก็ Deploy เอง)
เปิดลิงก์ที่ Vercel ให้ → ใช้งานได้เลย ทุกคนที่เปิดลิงก์นี้จะเห็นข้อมูลชุดเดียวกัน

## ทดสอบในเครื่องก่อน (ไม่บังคับ)
ถ้าอยากลองในเครื่องให้เหมือนของจริง ติดตั้ง Vercel CLI แล้วใช้:
```
npm i -g vercel
vercel link            (เชื่อมโฟลเดอร์นี้กับโปรเจกต์ Vercel)
vercel env pull        (ดึงค่า KV มาไว้ในเครื่อง)
vercel dev             (รันทั้งหน้าเว็บ + /api พร้อมฐานข้อมูลจริง)
```

## เปิดพี่เลี้ยง AI กลับมาในอนาคต
ตอนนี้แท็บ AI แสดง "ปิดปรับปรุง" ไว้ เมื่อพร้อมจะเปิด:
- สร้างไฟล์ `api/chat.js` ที่เรียก Gemini (เก็บ `GEMINI_API_KEY` ใน Environment Variables ของ Vercel)
- เปลี่ยนคอมโพเนนต์ `Assistant` กลับเป็นหน้าแชต
บอกได้เลยถ้าถึงตอนนั้น เดี๋ยวช่วยทำให้

## หมายเหตุ
- อย่า commit ไฟล์ `.env` ขึ้น GitHub (มีใน .gitignore แล้ว)
- คีย์ Gemini เดิมที่เคยรั่ว ให้ลบทิ้งที่ Google AI Studio ถ้ายังไม่ได้ทำ
