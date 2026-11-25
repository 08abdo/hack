const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

// --- دالة إرسال الإشعار للتيليغرام ---
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
// مسار سحري لربط التيليغرام أوتوماتيكيا
// -----------------------------------------------------
router.get("/setup-bot", async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // يجيب رابط السيرفر تاعك أوتوماتيكيا
  const webhookUrl = `https://${req.get('host')}/api/orders/webhook`; 
  
  if (!token) return res.send("❌ نسيت تحط TELEGRAM_BOT_TOKEN في Render");

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const data = await response.json();
    res.json({ message: "حالة ربط البوت:", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------
// استقبال نقرات الأزرار من التيليغرام (Webhook)
// -----------------------------------------------------
router.post("/webhook", async (req, res) => {
  // 🚨 لازم نرجعو الجواب للتيليغرام في الحين باش ما يتبلوكيش البوت
  res.sendStatus(200); 

  try {
    const update = req.body;
    if (!update.callback_query) return;

    const callbackQuery = update.callback_query;
    const data = callbackQuery.data; 
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    let newStatus = "";
    let orderId = "";

    if (data.startsWith("accept_")) {
      newStatus = "تم التوصيل";
      orderId = data.replace("accept_", "");
    } else if (data.startsWith("reject_")) {
      newStatus = "ملغى";
      orderId = data.replace("reject_", "");
    }

    if (orderId && newStatus) {
      // 1. تحديث الحالة في قاعدة البيانات Supabase
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;

      // 2. إرسال تنبيه صغير داخل التيليغرام
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: `تم تغيير حالة الطلب إلى: ${newStatus}`,
          show_alert: false
        })
      });

      // 3. مسح الأزرار من الرسالة باش ما تكليكيش عليها مرتين
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
           text: `✅ تم تحديث الطلب رقم ${orderId} إلى: ${newStatus}`,
           reply_to_message_id: messageId
         })
      });
    }
  } catch (err) {
    console.error("Webhook error:", err);
  }
});

// -----------------------------------------------------

// جلب جميع الطلبات
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إنشاء طلب جديد
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
    
    // إرسال الإشعار
    await sendTelegramNotification(data[0]);

    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تحديث حالة الطلب
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
