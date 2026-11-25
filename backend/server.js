require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 1. تفعيل مجلد الملفات الثابتة (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname)));

// 2. مسارات (Routes) قاعدة البيانات
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const categoriesRoutes = require("./routes/categories");

app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/categories", categoriesRoutes);

// 3. توجيه أي مسار آخر للصفحة الرئيسية (باش يخدم الموقع مباشرة)
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
