const express = require("express");
const router = express.Router();
const supabase = require("../supabase");
const sharp = require("sharp");

// ذاكرة تخزين مؤقت لسيرفر Node.js
let productsCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 3 * 60 * 1000;

const invalidateCache = () => {
  productsCache = null;
  lastCacheTime = 0;
};

// دالة مساعدة لرفع صور Base64 إلى Supabase Storage وإرجاع روابط سريعة
const processImages = async (imagesList) => {
  if (!Array.isArray(imagesList) || imagesList.length === 0) return [];

  const processedImages = await Promise.all(
    imagesList.map(async (img) => {
      // التحقق مما إذا كانت الصورة كائن (Object) يحتوي على src و color أم نص عادي
      let rawBase64 = "";
      let colorTag = "";

      if (typeof img === "object" && img !== null) {
        rawBase64 = img.src || img.url || "";
        colorTag = img.color || "";
      } else if (typeof img === "string") {
        rawBase64 = img;
      }

      // إذا كانت الصورة بصيغة Base64 قم بضغطها ورفعها إلى Supabase Storage Bucket
      if (typeof rawBase64 === "string" && rawBase64.startsWith("data:image")) {
        try {
          const parts = rawBase64.split(";base64,");
          const imageBuffer = Buffer.from(parts[1], "base64");

          // 1. ضغط الصورة باستخدام Sharp بأسلوب متوافق مع كافة الشاشات
          const compressedBuffer = await sharp(imageBuffer)
            .resize({ width: 800, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

          // 2. اسم فريد للملف في Storage
          const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

          // 3. رفع الصورة المباشرة لـ Supabase Storage (Bucket: products)
          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(fileName, compressedBuffer, {
              contentType: "image/webp",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          // 4. استخراج الرابط المباشر للعموم (Public URL)
          const { data: publicUrlData } = supabase.storage
            .from("products")
            .getPublicUrl(fileName);

          const publicUrl = publicUrlData.publicUrl;

          // إرجاع البنية حسب ما كانت عليه الكائنات الأصيلة
          if (typeof img === "object" && img !== null) {
            return { ...img, src: publicUrl };
          }
          return publicUrl;
        } catch (err) {
          console.error("خطأ رفع الصورة لـ Storage:", err.message);
          return img; // في حالة الخطأ احتفظ بالقيمة الأصلية
        }
      }

      return img; // إذا كانت الصورة رابطاً جاهزاً اتركها كما هي
    })
  );

  return processedImages;
};

// 1. جلب المنتجات (GET)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const full = req.query.full === "true";
    const now = Date.now();

    if (!page && !limit && !full && productsCache && (now - lastCacheTime < CACHE_DURATION)) {
      res.setHeader("X-Cache", "HIT");
      return res.json(productsCache);
    }

    const selectFields = full
      ? "*"
      : "id, name, category, price, old_price, images, sizes, created_at";

    let query = supabase
      .from("products")
      .select(selectFields)
      .order("created_at", { ascending: false });

    if (page && limit) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!page && !limit && !full) {
      productsCache = data;
      lastCacheTime = now;
    }

    res.setHeader("X-Cache", "MISS");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. إضافة منتج جديد (POST)
router.post("/", async (req, res) => {
  const { name, category, price, old_price, cost, images, sizes, desc_text } = req.body;

  if (!name || price === undefined || cost === undefined) {
    return res.status(400).json({ error: "الاسم، سعر البيع، والتكلفة حقول إجبارية" });
  }

  const profit = parseFloat(price) - parseFloat(cost);

  try {
    // رفع وصغط الصور لـ Supabase Storage وتخزين الروابط فقط
    const optimizedImages = await processImages(images);

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          category,
          price,
          old_price: old_price || null,
          cost,
          profit,
          sizes: sizes || [],
          images: optimizedImages,
          desc_text,
        },
      ])
      .select();

    if (error) throw error;

    invalidateCache();
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. تعديل منتج موجود (PUT)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, price, old_price, cost, images, sizes, desc_text } = req.body;

  const profit = parseFloat(price) - parseFloat(cost);

  try {
    // رفع وضغط الصور لـ Supabase Storage وتخزين الروابط فقط
    const optimizedImages = await processImages(images);

    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        category,
        price,
        old_price: old_price || null,
        cost,
        profit,
        sizes: sizes || [],
        images: optimizedImages,
        desc_text,
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }

    invalidateCache();
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. حذف منتج (DELETE)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) throw error;

    invalidateCache();
    res.json({ message: "تم حذف المنتج بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
