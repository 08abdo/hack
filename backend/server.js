require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// تحديد مجلد الواجهة (frontend) كملفات ثابتة
// استخدمنا path.join للرجوع خطوة للخلف ثم الدخول لمجلد frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const categoriesRoutes = require("./routes/categories");

app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/categories", categoriesRoutes);

// توجيه مسار الأدمن لملف admin.html
app.get("/admin", (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});

// توجيه كل المسارات الأخرى لملف index.html داخل مجلد frontend
// استعملنا app.use لأنها أفضل مع النسخ الجديدة
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
