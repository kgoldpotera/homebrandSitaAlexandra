import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    const { cartItems, shippingAddress } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    if (!shippingAddress) {
      throw new Error("Shipping address is required");
    }

    console.log("Processing checkout for user:", user.email);
    console.log("Cart items:", cartItems.length);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Existing customer found:", customerId);
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: shippingAddress.name,
      });
      customerId = customer.id;
      console.log("New customer created:", customerId);
    }

    // Calculate total
    const total = cartItems.reduce(
      (sum: number, item: any) => sum + Number(item.products.price) * item.quantity,
      0
    );

    // Create order record first
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
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log("Order created:", order.id);

    // Create order items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.products.price,
    }));

    const { error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    console.log("Order items created");

    // Create Stripe line items
    const lineItems = cartItems.map((item: any) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.products.name,
          images: item.products.image_url ? [item.products.image_url] : [],
        },
        unit_amount: Math.round(Number(item.products.price) * 100), // Convert to pence
      },
      quantity: item.quantity,
    }));

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
      metadata: {
        order_id: order.id,
        user_id: user.id,
      },
    });

    console.log("Checkout session created:", session.id);

    // Update order with stripe payment intent id
    await supabaseClient
      .from("orders")
      .update({ stripe_payment_intent_id: session.payment_intent as string })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ url: session.url, orderId: order.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
