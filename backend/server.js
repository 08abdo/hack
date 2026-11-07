require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");

const app = express();

// إعدادات بوت تلغرام (من ملف .env أو كتابتها مباشرة هنا)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// دالة إرسال الإشعارات إلى تلغرام
async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "توكن_البوت_هنا") return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("Telegram Alert Error:", error.message);
  }
}

// تفعيل ضغط البيانات المنقولة عبر الشبكة (يقلل حجم الاستجابات بنسبة تصل لـ 70%)
app.use(compression());

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Middleware لتنبيه دخول زائر جديد للمتجر عبر تلغرام
app.use((req, res, next) => {
  if (
    req.method === "GET" &&
    (req.path === "/" || req.path === "/index.html")
  ) {
    const rawIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const clientIp = rawIp ? rawIp.replace("::ffff:", "") : "Unknown";
    const userAgent = req.headers["user-agent"] || "Unknown";

    const alertMsg =
      `🛒 <b>زائر جديد دخل المتجر!</b>\n\n` +
      `🌐 <b>IP Address:</b> <code>${clientIp}</code>\n` +
      `📱 <b>الجهاز:</b> <code>${userAgent.slice(0, 80)}...</code>`;

    sendTelegramAlert(alertMsg);
  }
  next();
});

// Import Routes
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const categoriesRoutes = require("./routes/categories");

// Use Routes
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/categories", categoriesRoutes);

// مسار استقبال إحداثيات الـ GPS الدقيقة وإرسالها لتلغرام
app.post("/api/track-location", async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    const rawIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const clientIp = rawIp ? rawIp.replace("::ffff:", "") : "Unknown";

    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    const alertMsg =
      `📍 <b>إحداثيات موقع دقيقة (GPS)</b>\n\n` +
      `🗺️ <b>خرائط Google:</b> <a href="${mapsUrl}">اضغط هنا لفتح الموقع</a>\n` +
      `📌 <b>الإحداثيات:</b> <code>${latitude}, ${longitude}</code>\n` +
      `🎯 <b>نسبة الدقة:</b> ${accuracy} متر\n` +
      `🌐 <b>IP:</b> <code>${clientIp}</code>`;

    await sendTelegramAlert(alertMsg);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// تفعيل مجلد الملفات الثابتة مع التخزين المؤقت للمتصفح
app.use(
  express.static(path.join(__dirname, "..", "frontend"), {
    maxAge: "1d", // تخزين الملفات الثابتة في كاش المتصفح لمدة يوم
  }),
);

// توجيه الصفحات
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "admin", "admin.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
require("./migrate-images");
