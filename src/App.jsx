import { useState, useEffect } from "react";
import "./App.css";

// ─── ตั้งเวลาที่จะกลับมาเปิดให้บริการ / Set your return time ───
// new Date(ปี, เดือน[0 = ม.ค.], วัน, ชั่วโมง, นาที)
const TARGET = new Date(2026, 4, 28, 9, 0).getTime(); // 28 พ.ค. 2026, 09:00

function getRemaining() {
  const diff = TARGET - Date.now();
  const pad = (n) => String(n).padStart(2, "0");
  if (diff <= 0) return { d: "00", h: "00", m: "00", s: "00" };
  const t = Math.floor(diff / 1000);
  return {
    d: pad(Math.floor(t / 86400)),
    h: pad(Math.floor((t % 86400) / 3600)),
    m: pad(Math.floor((t % 3600) / 60)),
    s: pad(t % 60),
  };
}

export default function App() {
  const [time, setTime] = useState(getRemaining());

  useEffect(() => {
    const id = setInterval(() => setTime(getRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="aurora">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>
      <div className="grid" />

      <main className="card">
        <span className="status reveal d1">
          <span className="dot" />
          กำลังปรับปรุง · Maintenance
        </span>

        <h1 className="reveal d2">ระบบปิดปรับปรุงชั่วคราว</h1>
        <p className="h1-en reveal d2">We&rsquo;ll be back soon</p>

        <p className="lead reveal d3">
          ขออภัยในความไม่สะดวก เรากำลังพัฒนาระบบเพื่อประสบการณ์ที่ดียิ่งขึ้น
          และจะกลับมาให้บริการในเร็ว ๆ นี้
        </p>
        <p className="lead-en reveal d3">
          We&rsquo;re currently performing scheduled maintenance to improve your
          experience. Thank you for your patience.
        </p>

        <div className="countdown reveal d4" aria-label="เวลานับถอยหลัง">
          <div className="unit">
            <span className="num">{time.d}</span>
            <span className="lbl">
              วัน<small>Days</small>
            </span>
          </div>
          <div className="unit">
            <span className="num">{time.h}</span>
            <span className="lbl">
              ชั่วโมง<small>Hours</small>
            </span>
          </div>
          <div className="unit">
            <span className="num">{time.m}</span>
            <span className="lbl">
              นาที<small>Minutes</small>
            </span>
          </div>
          <div className="unit">
            <span className="num">{time.s}</span>
            <span className="lbl">
              วินาที<small>Seconds</small>
            </span>
          </div>
        </div>

        <div className="divider reveal d5" />

        <div className="contact-grid reveal d5">
          <a className="chip" href="mailto:support@example.com">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            infostarmusicproject@gmail.com
          </a>
          <a className="chip" href="tel:021234567">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
            </svg>
            080-612-4205
          </a>
        </div>

        <div className="socials reveal d5">
          <a href="#" aria-label="Facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 22v-8h2.7l.4-3H13V9c0-.9.3-1.5 1.6-1.5H16V4.8c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.9V11H7.5v3H10v8h3z" />
            </svg>
          </a>
          <a href="#" aria-label="Line">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.5 2 2 5.6 2 10c0 3.9 3.6 7.2 8.4 7.8.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.1-6C21.4 13.1 22 11.6 22 10c0-4.4-4.5-8-10-8z" />
            </svg>
          </a>
          <a href="#" aria-label="Instagram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>
      </main>
    </>
  );
}
