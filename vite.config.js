import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// บน Vercel ไม่ต้องใช้ proxy (โฮสต์รวมหน้าเว็บ + /api ให้เอง)
// proxy ด้านล่างมีไว้เผื่อรันในเครื่องด้วย `vercel dev` (พอร์ต 3000)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
});
