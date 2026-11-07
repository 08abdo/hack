const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

// 1. جلب جميع الأقسام
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("خطأ جلب الأقسام:", err.message);
    res.status(500).json({ error: "تعذر جلب الأقسام من قاعدة البيانات" });
  }
});

// 2. إضافة قسم جديد
router.post("/", async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "اسم القسم مطلوب" });
  }

  try {
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name: name.trim() }])
      .select();

    if (error) {
      // إذا كان القسم موجوداً مسبقاً (Unique Constraint / Code 23505)
      if (error.code === "23505" || error.message.includes("duplicate key")) {
        return res.status(400).json({ error: "هذا القسم موجود بالفعل!" });
      }
      return res.status(400).json({ error: "تعذر إضافة القسم، أعد المحاولة." });
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ error: "لم يتم إرجاع بيانات بعد الإضافة" });
    }

    res.status(201).json(data[0]);
  } catch (err) {
    console.error("خطأ إضافة قسم:", err.message);
    res.status(500).json({ error: "حدث خطأ غير متوقع في السيرفر" });
  }
});

// 3. حذف قسم
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
    res.json({ message: "تم حذف القسم بنجاح" });
  } catch (err) {
    console.error("خطأ حذف قسم:", err.message);
    res.status(500).json({ error: "حدث خطأ أثناء حذف القسم" });
  }
});

module.exports = router;
