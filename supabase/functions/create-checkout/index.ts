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

/** small helper to write fallback logs into the DB (if available) */
async function dbLog(supabaseClient: any, message: string) {
  try {
    await supabaseClient.from("function_logs").insert({
      message,
      created_at: nowIso(),
    });
  } catch (err) {
    // best effort: if DB logging fails, at least console.error
    console.error("dbLog failed:", err);
  }
}

/** Deno-safe Resend HTTP wrapper */
async function sendEmailWithResend(
  resendApiKey: string | null,
  from: string,
  to: string[],
  cc: string[] | undefined,
  subject: string,
  html: string
) {
  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const body: any = {
    from,
    to,
    subject,
    html,
  };

  if (cc && cc.length > 0) body.cc = cc;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // attempt to parse response (Resend returns JSON)
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error(`Resend returned non-json response (status ${res.status})`);
  }

  if (!res.ok) {
    // include body message if provided
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

    if (!authHeader) {
      const msg = "Missing Authorization header";
      console.error(msg);
      await dbLog(supabaseClient, `Auth error: ${msg}`);
      throw new Error(msg);
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      const msg = "Authorization header present but token empty";
      console.error(msg);
      await dbLog(supabaseClient, `Auth error: ${msg}`);
      throw new Error(msg);
    }

    // fetch user from token
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser(token);
    if (userError) {
      console.error("Error fetching user:", userError);
      await dbLog(
        supabaseClient,
        `Error fetching user: ${JSON.stringify(userError)}`
      );
      throw new Error("Failed to fetch user from token");
    }
    const user = userData.user;
    console.log("User fetched:", user?.id, user?.email);
    if (!user?.email) {
      const msg = "User not authenticated or no email available";
      console.error(msg);
      await dbLog(supabaseClient, `Auth error: ${msg}`);
      throw new Error(msg);
    }

    // parse body
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      console.error("Failed to parse JSON body:", err);
      await dbLog(supabaseClient, `Bad JSON body: ${err}`);
      throw new Error("Invalid JSON body");
    }
    console.log("Request body:", body);

    const { cartItems, shippingAddress } = body;
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      const msg = "Cart is empty";
      console.error(msg);
      await dbLog(supabaseClient, `Checkout error: ${msg}`);
      throw new Error(msg);
    }
    if (!shippingAddress) {
      const msg = "Shipping address missing";
      console.error(msg);
      await dbLog(supabaseClient, `Checkout error: ${msg}`);
      throw new Error(msg);
    }

    console.log(
      "Processing checkout for:",
      user.email,
      "items:",
      cartItems.length
    );

    // init stripe
    if (!stripeSecret) {
      const msg = "Missing STRIPE_SECRET_KEY env";
      console.error(msg);
      await dbLog(supabaseClient, `Stripe config error: ${msg}`);
      throw new Error(msg);
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

    // find or create stripe customer
    let customerId: string | undefined;
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      console.log("Stripe customers found:", customers.data.length);
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("Existing stripe customer:", customerId);
      } else {
        const created = await stripe.customers.create({
          email: user.email,
          name: shippingAddress.name,
        });
        customerId = created.id;
        console.log("Created stripe customer:", customerId);
      }
    } catch (err) {
      console.error("Stripe customer error:", err);
      await dbLog(supabaseClient, `Stripe customer error: ${String(err)}`);
      throw new Error("Stripe customer creation/list error");
    }

    // calculate total
    const total = cartItems.reduce(
      (sum: number, item: any) =>
        sum +
        Number(item.products?.price ?? item.price ?? 0) * (item.quantity ?? 1),
      0
    );
    console.log("Calculated total:", total);

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

    if (orderError) {
      console.error("Error creating order:", orderError);
      await dbLog(
        supabaseClient,
        `Order creation error: ${JSON.stringify(orderError)}`
      );
      throw new Error(`Failed to create order: ${orderError.message}`);
    }
    console.log("Order created id:", order.id);

    // create order_items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity ?? 1,
      price: item.products?.price ?? item.price ?? 0,
    }));
    console.log("Prepared order items:", orderItems);

    try {
      const { error: itemsError } = await supabaseClient
        .from("order_items")
        .insert(orderItems);
      if (itemsError) {
        console.error("Error inserting order_items:", itemsError);
        await dbLog(
          supabaseClient,
          `Order items insertion error: ${JSON.stringify(itemsError)}`
        );
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }
      console.log("Order items inserted");
    } catch (err) {
      console.error("Exception inserting order_items:", err);
      await dbLog(supabaseClient, `Order items exception: ${String(err)}`);
      throw err;
    }

    // create stripe line items
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
    console.log("Line items for Stripe:", lineItems);

    // create checkout session
    let session: any;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: lineItems,
        mode: "payment",
        success_url: `${req.headers.get(
          "origin"
        )}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
        metadata: {
          order_id: order.id,
          user_id: user.id,
        },
      });
      console.log("Stripe checkout session created:", session.id);
    } catch (err) {
      console.error("Stripe checkout session error:", err);
      await dbLog(supabaseClient, `Stripe session error: ${String(err)}`);
      throw new Error("Failed to create Stripe checkout session");
    }

    // generate tracking number
    const trackingNumber = `SA${Date.now().toString().slice(-8)}${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
    console.log("Generated tracking number:", trackingNumber);

    // estimate delivery
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 10);
    const estimatedDeliveryIso = estimatedDelivery.toISOString();
    console.log("Estimated delivery:", estimatedDeliveryIso);

    // update order with stripe + tracking
    const { data: updatedOrder, error: updateError } = await supabaseClient
      .from("orders")
      .update({
        stripe_payment_intent_id: session.payment_intent ?? null,
        tracking_number: trackingNumber,
        estimated_delivery_date: estimatedDeliveryIso,
        delivery_status: "processing",
      })
      .eq("id", order.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating order:", updateError);
      await dbLog(
        supabaseClient,
        `Order update error: ${JSON.stringify(updateError)}`
      );
      throw new Error(`Failed to update order: ${updateError.message}`);
    }
    console.log(
      "Order updated:",
      updatedOrder?.id,
      "tracking:",
      updatedOrder?.tracking_number
    );

    // --- Send confirmation email (Resend via fetch) ---
    try {
      console.log("Preparing email send via Resend...");
      await dbLog(
        supabaseClient,
        `Preparing email for order ${updatedOrder.id}`
      );

      const fromAddress = "House of Lepallevon <admin@resend.dev>";
      const toAddresses = [updatedOrder.customer_email];
      const ccAddresses = adminEmails.length > 0 ? adminEmails : [];

      const subject = `Your Order #${updatedOrder.id} Confirmation – House of Lepallevon`;
      const htmlContent = `
        <div style="font-family:Arial, sans-serif; line-height:1.5; color:#333;">
          <h2 style="color:#111;">Thank you for your purchase, ${
            updatedOrder.customer_name
          }!</h2>
          <p>Your order has been successfully placed and is now being processed.</p>
          <p><strong>Tracking Number:</strong> ${
            updatedOrder.tracking_number
          }</p>
          <p>Estimated Delivery: <strong>${new Date(
            updatedOrder.estimated_delivery_date
          ).toLocaleDateString()}</strong></p>
          <hr/>
          <p>You will receive further updates once your order ships.</p>
          <p style="margin-top:1.5em;">— The House of Lepallevon Team</p>
        </div>
      `;

      const resendResp = await sendEmailWithResend(
        resendApiKey ?? null,
        fromAddress,
        toAddresses,
        ccAddresses.length > 0 ? ccAddresses : undefined,
        subject,
        htmlContent
      );

      console.log("Resend API response:", resendResp);
      await dbLog(supabaseClient, `Resend sent for order ${updatedOrder.id}`);
    } catch (emailErr) {
      console.error("Error sending email:", emailErr);
      await dbLog(
        supabaseClient,
        `Email error for order ${order.id}: ${String(emailErr)}`
      );
      // do NOT fail the whole checkout because of email failure — continue
    }

    // success response: return checkout URL and order details
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
    // attempt to persist critical error
    try {
      await dbLog(supabaseClient, `Checkout error: ${String(error)}`);
    } catch (e) {
      console.error("Failed to write checkout error to DB:", e);
    }

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
