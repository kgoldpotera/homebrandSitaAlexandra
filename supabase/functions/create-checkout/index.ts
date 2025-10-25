import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function nowIso() {
  return new Date().toISOString();
}

/** Helper: Write fallback logs into DB */
async function dbLog(supabaseClient: any, message: string) {
  try {
    await supabaseClient.from("function_logs").insert({
      message,
      created_at: nowIso(),
    });
  } catch (err) {
    console.error("dbLog failed:", err);
  }
}

/** Helper: Send email using Resend API */
async function sendEmailWithResend(
  resendApiKey: string | null,
  from: string,
  to: string[],
  cc: string[] | undefined,
  subject: string,
  html: string,
  replyTo?: string
) {
  if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");

  const body: any = {
    from,
    to,
    subject,
    html,
  };
  if (cc && cc.length > 0) body.cc = cc;
  if (replyTo) body.reply_to = replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Resend returned non-json response (status ${res.status})`);
  }

  if (!res.ok) {
    const msg = json?.error ?? JSON.stringify(json);
    throw new Error(`Resend API error (status ${res.status}): ${msg}`);
  }

  return json;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Incoming request:", req.method, req.url);

  const supabaseUrl = Deno.env.get("URL") ?? Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const adminEnv = Deno.env.get("ADMIN_EMAILS") ?? "koechmanoah32@gmail.com";
  const adminEmails = adminEnv
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  console.log("Env check:", {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    hasStripeKey: !!stripeSecret,
    hasResendKey: !!resendApiKey,
    adminEmailsCount: adminEmails.length,
  });

  if (!supabaseUrl || !supabaseServiceKey) {
    const msg = "Missing Supabase URL or service role key in environment";
    console.error(msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    console.log("Auth header present:", !!authHeader);
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Authorization token empty");

    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser(token);
    if (userError)
      throw new Error(`Auth user fetch error: ${JSON.stringify(userError)}`);
    const user = userData.user;
    if (!user?.email)
      throw new Error("User not authenticated or missing email");

    const body = await req.json().catch((err) => {
      throw new Error("Invalid JSON body: " + err);
    });

    const { cartItems, shippingAddress } = body;
    if (!cartItems || cartItems.length === 0) throw new Error("Cart is empty");
    if (!shippingAddress) throw new Error("Missing shipping address");

    console.log(
      `Processing checkout for ${user.email}, items: ${cartItems.length}`
    );

    if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY env");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

    // find or create Stripe customer
    let customerId: string | undefined;
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const created = await stripe.customers.create({
        email: user.email,
        name: shippingAddress.name,
      });
      customerId = created.id;
    }

    const total = cartItems.reduce(
      (sum: number, item: any) =>
        sum +
        Number(item.products?.price ?? item.price ?? 0) * (item.quantity ?? 1),
      0
    );

    // create order
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        amount: total,
        status: "pending",
        customer_name: shippingAddress.name,
        customer_email: user.email,
        shipping_address_line1: shippingAddress.line1,
        shipping_address_line2: shippingAddress.line2,
        shipping_city: shippingAddress.city,
        shipping_postal_code: shippingAddress.postalCode,
        shipping_country: shippingAddress.country,
      })
      .select()
      .single();

    if (orderError)
      throw new Error(`Order creation error: ${orderError.message}`);

    // create order items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity ?? 1,
      price: item.products?.price ?? item.price ?? 0,
    }));
    const { error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);
    if (itemsError)
      throw new Error(`Order items insert error: ${itemsError.message}`);

    // Stripe line items
    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.products?.name ?? item.name ?? "Product",
          images: item.products?.image_url ? [item.products.image_url] : [],
        },
        unit_amount: Math.round(
          Number(item.products?.price ?? item.price ?? 0) * 100
        ),
      },
      quantity: item.quantity ?? 1,
    }));

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get(
        "origin"
      )}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
      metadata: { order_id: order.id, user_id: user.id },
    });

    // tracking + estimated delivery
    const trackingNumber = `SA${Date.now().toString().slice(-8)}${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 10);

    const { data: updatedOrder, error: updateError } = await supabaseClient
      .from("orders")
      .update({
        stripe_payment_intent_id: session.payment_intent ?? null,
        tracking_number: trackingNumber,
        estimated_delivery_date: estimatedDelivery.toISOString(),
        delivery_status: "processing",
      })
      .eq("id", order.id)
      .select()
      .single();

    if (updateError)
      throw new Error(`Order update error: ${updateError.message}`);
    console.log(
      "Order updated:",
      updatedOrder.id,
      "tracking:",
      updatedOrder.tracking_number
    );

    // --- Send confirmation email ---
    try {
      console.log("Preparing email send via Resend...");
      const fromAddress = "House of Lepallevon <orders@neemacarellc.org>"; // ✅ verified domain
      const toAddresses = [updatedOrder.customer_email];
      const ccAddresses = adminEmails;
      const replyTo = "support@neemacarellc.org";

      const subject = `Your Order #${updatedOrder.id} Confirmation – House of Lepallevon`;
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
          <h2 style="color:#111;">Thank you for your purchase, ${
            updatedOrder.customer_name
          }!</h2>
          <p>Your order has been placed successfully and is now being processed.</p>
          <p><strong>Tracking Number:</strong> ${
            updatedOrder.tracking_number
          }</p>
          <p>Estimated Delivery: <strong>${new Date(
            updatedOrder.estimated_delivery_date
          ).toLocaleDateString()}</strong></p>
          <p>We’ll notify you when it’s shipped.</p>
          <hr style="margin:20px 0; border:none; border-top:1px solid #ccc;">
          <p>For questions, reply to this email or contact us at support@neemacarellc.org.</p>
          <p style="margin-top:20px;">— The House of Lepallevon Team</p>
        </div>
      `;

      const result = await sendEmailWithResend(
        resendApiKey,
        fromAddress,
        toAddresses,
        ccAddresses,
        subject,
        html,
        replyTo
      );

      console.log("Resend API response:", result);
      await dbLog(
        supabaseClient,
        `Resend email sent for order ${updatedOrder.id}`
      );
    } catch (emailErr) {
      console.error("Error sending email:", emailErr);
      await dbLog(
        supabaseClient,
        `Email error for order ${order.id}: ${String(emailErr)}`
      );
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        orderId: updatedOrder.id,
        trackingNumber: updatedOrder.tracking_number,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Checkout error caught:", error);
    await dbLog(supabaseClient, `Checkout error: ${String(error)}`);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
