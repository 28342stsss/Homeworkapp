import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ส่งต่อคำขอ /api ทั้งหมดไปยัง backend (server.mjs) ที่พอร์ต 8787
// ทำให้หน้าเว็บเรียก "/api/chat" ได้ตรง ๆ โดยไม่ติดปัญหา CORS
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5174",
    },
  },
});
