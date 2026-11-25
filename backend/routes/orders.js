const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

// --- دالة إرسال الإشعار للتيليغرام مع الأزرار ---
const sendTelegramNotification = async (orderData) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  const message = `
📦 <b>طلب جديد من المتجر!</b> 📦

👤 <b>الزبون:</b> ${orderData.customer_name}
📞 <b>الهاتف:</b> ${orderData.phone}
📍 <b>العنوان:</b> ${orderData.address}

🛒 <b>المنتج:</b> ${orderData.product_name}
🎨 <b>اللون:</b> ${orderData.color || 'غير محدد'}
📏 <b>المقاس:</b> ${orderData.size || 'غير محدد'}
💰 <b>المجموع:</b> ${orderData.total} دج

🔢 <b>رقم الطلب:</b> ${orderData.order_code}
  `;

  // الأزرار اللي راح يخرجو تحت الرسالة
  const reply_markup = {
    inline_keyboard: [
      [
        { text: "✅ قبول (تم التوصيل)", callback_data: `accept_${orderData.id}` },
        { text: "❌ إلغاء الطلب", callback_data: `reject_${orderData.id}` }
      ]
    ]
  };

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_markup: reply_markup
      })
    });
  } catch (err) {
    console.error("Telegram notification error:", err);
  }
};

// -----------------------------------------------------
// 1. استقبال نقرات الأزرار من التيليغرام (Webhook)
// -----------------------------------------------------
router.post("/webhook", async (req, res) => {
  const update = req.body;

  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const data = callbackQuery.data; // يجيب accept_1 أو reject_1
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    let newStatus = "";
    let orderId = "";

    if (data.startsWith("accept_")) {
      newStatus = "تم التوصيل";
      orderId = data.split("_")[1];
    } else if (data.startsWith("reject_")) {
      newStatus = "ملغى";
      orderId = data.split("_")[1];
    }

    if (orderId && newStatus) {
      // 1. تحديث الحالة في قاعدة البيانات Supabase
      await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);

      // 2. إرسال تنبيه صغير داخل التيليغرام بلي تمت العملية
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: `تم تغيير حالة الطلب إلى: ${newStatus}`,
          show_alert: true
        })
      });

      // 3. مسح الأزرار من الرسالة القديمة باش ما تكليكيش عليهم مرتين
      await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] }
        })
      });
      
      // 4. كتابة رسالة تأكيد في الشات
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           chat_id: chatId,
           text: `✅ تم تحديث الطلب رقم ${orderId} إلى: ${newStatus}`
         })
      });
    }
  }
  
  // لازم دايما نرجعو 200 للتيليغرام باش يعرف بلي استلمنا الأمر
  res.sendStatus(200); 
});

// -----------------------------------------------------

// 2. جلب جميع الطلبات
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. إنشاء طلب جديد وإرسال الإشعار
router.post("/", async (req, res) => {
  const { customer_name, phone, address, total, product_name, product_img, color, size } = req.body;

  if (!customer_name || !phone || !address) {
    return res.status(400).json({ error: "يرجى ملء جميع البيانات المطلوبة للطلب" });
  }

  const order_code = "#ORD-" + Math.floor(100000 + Math.random() * 900000);

  try {
    const { data, error } = await supabase
      .from("orders")
      .insert([{
        order_code, customer_name, phone, address, total, product_name, product_img, color, size: size || null, status: "قيد الانتظار"
      }])
      .select();

    if (error) throw error;
    
    // نبعثو الميساج للتيليغرام
    await sendTelegramNotification(data[0]);

    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. تحديث حالة الطلب من لوحة التحكم
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
