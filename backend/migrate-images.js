const supabase = require("./supabase");
const sharp = require("sharp");

async function migrateOldImages() {
  console.log("🔄 جاري بدء فحص المنتجات القديمة وتحويل الصور...");

  // 1. جلب جميع المنتجات
  const { data: products, error } = await supabase.from("products").select("*");

  if (error) {
    console.error("❌ خطأ في جلب المنتجات:", error.message);
    return;
  }

  console.log(`📦 تم إيجاد ${products.length} منتج.`);

  for (const product of products) {
    if (!product.images || product.images.length === 0) continue;

    let updated = false;

    const newImages = await Promise.all(
      product.images.map(async (img) => {
        let rawBase64 = "";
        if (typeof img === "object" && img !== null) {
          rawBase64 = img.src || img.url || "";
        } else if (typeof img === "string") {
          rawBase64 = img;
        }

        // تحويل صور Base64 فقط
        if (typeof rawBase64 === "string" && rawBase64.startsWith("data:image")) {
          try {
            const parts = rawBase64.split(";base64,");
            const imageBuffer = Buffer.from(parts[1], "base64");

            // ضغط الصورة
            const compressedBuffer = await sharp(imageBuffer)
              .resize({ width: 800, fit: "inside", withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();

            const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

            // رفع إلى Supabase Storage (Bucket: products)
            const { error: uploadError } = await supabase.storage
              .from("products")
              .upload(fileName, compressedBuffer, {
                contentType: "image/webp",
                upsert: true,
              });

            if (uploadError) throw uploadError;

            // الحصول على الرابط المباشر
            const { data: publicUrlData } = supabase.storage
              .from("products")
              .getPublicUrl(fileName);

            const publicUrl = publicUrlData.publicUrl;
            updated = true;

            if (typeof img === "object" && img !== null) {
              return { ...img, src: publicUrl };
            }
            return publicUrl;
          } catch (err) {
            console.error(`❌ خطأ في تحويل صورة للمنتج ${product.name}:`, err.message);
            return img;
          }
        }
        return img;
      })
    );

    // إذا تم تحويل صور للمنتج، احفظ التحديث في قاعدة البيانات
    if (updated) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ images: newImages })
        .eq("id", product.id);

      if (updateError) {
        console.error(`❌ فشل تحديث المنتج ${product.name}:`, updateError.message);
      } else {
        console.log(`✅ تم تحويل صور المنتج: ${product.name}`);
      }
    }
  }

  console.log("🎉 اكتملت عملية تحويل كافة الصور بنجاح!");
}

migrateOldImages();
