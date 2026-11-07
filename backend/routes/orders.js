const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

// 1. جلب جميع الطلبات
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. إنشاء طلب جديد
router.post("/", async (req, res) => {
  const {
    customer_name,
    phone,
    address,
    total,
    product_name,
    product_img,
    color,
    size,
  } = req.body;

  if (!customer_name || !phone || !address) {
    return res
      .status(400)
      .json({ error: "يرجى ملء جميع البيانات المطلوبة للطلب" });
  }

  const order_code = "#ORD-" + Math.floor(100000 + Math.random() * 900000);

  try {
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          order_code,
          customer_name,
          phone,
          address,
          total,
          product_name,
          product_img,
          color,
          size: size || null,
          status: "قيد الانتظار",
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. تحديث حالة الطلب (تم التوصيل / ملغى)
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
