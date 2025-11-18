import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, Package, Truck, CheckCircle, Clock } from "lucide-react";

interface Order {
  id: string;
  tracking_number: string;
  delivery_status: string;
  estimated_delivery_date: string;
  delivered_at: string | null;
  amount: number;
  customer_name: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  created_at: string;
}

const OrderTracking = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(
    searchParams.get("tracking") || ""
  );
  const [order, setOrder] = useState<Order | null>(null);

  // 🔹 Fetch order details
  const handleTrackOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!trackingNumber.trim()) {
      toast({
        title: "Missing tracking number",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("tracking_number", trackingNumber.trim())
        .single();

      if (error || !data) {
        toast({
          title: "Order not found",
          description: "No order found with this tracking number",
          variant: "destructive",
        });
        setOrder(null);
        return;
      }

      setOrder(data as Order);
    } catch (error: any) {
      console.error("Tracking error:", error);
      toast({
        title: "Error",
        description: "Failed to track order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Real-time updates (Supabase listener)
  useEffect(() => {
    if (!trackingNumber) return;

    const channel = supabase
      .channel("order-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `tracking_number=eq.${trackingNumber.trim()}`,
        },
        (payload) => {
          console.log("🔄 Real-time update received:", payload.new);
          setOrder(payload.new as Order);
        }
      )
      .subscribe();

    return () => {
      console.log("🧹 Unsubscribing from order updates...");
      supabase.removeChannel(channel);
    };
  }, [trackingNumber]);

  // 🔹 Auto-track if tracking number is in URL
  useEffect(() => {
    if (searchParams.get("tracking") && !order && !loading) {
      handleTrackOrder();
    }
  }, [searchParams]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processing":
        return "bg-blue-500";
      case "shipped":
        return "bg-orange-500";
      case "delivered":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Track Your Order</h1>

        <Card className="max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle>Enter Tracking Number</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrackOrder} className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="tracking" className="sr-only">
                  Tracking Number
                </Label>
                <Input
                  id="tracking"
                  placeholder="Enter your tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  "Track Order"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {order && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Order #{order.tracking_number}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Placed on {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(order.delivery_status)}>
                    {order.delivery_status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Delivery Status Timeline */}
                <div className="relative">
                  <div className="flex justify-between mb-4">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`rounded-full p-3 ${
                          order.delivery_status === "processing" ||
                          order.delivery_status === "shipped" ||
                          order.delivery_status === "delivered"
                            ? "bg-primary"
                            : "bg-gray-200"
                        }`}
                      >
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-xs mt-2 text-center font-medium">
                        Processing
                      </p>
                    </div>
                    <div className="flex-1 flex items-start pt-5">
                      <div
                        className={`h-1 w-full ${
                          order.delivery_status === "shipped" ||
                          order.delivery_status === "delivered"
                            ? "bg-primary"
                            : "bg-gray-200"
                        }`}
                      />
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`rounded-full p-3 ${
                          order.delivery_status === "shipped" ||
                          order.delivery_status === "delivered"
                            ? "bg-primary"
                            : "bg-gray-200"
                        }`}
                      >
                        <Truck className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-xs mt-2 text-center font-medium">
                        Shipped
                      </p>
                    </div>
                    <div className="flex-1 flex items-start pt-5">
                      <div
                        className={`h-1 w-full ${
                          order.delivery_status === "delivered"
                            ? "bg-primary"
                            : "bg-gray-200"
                        }`}
                      />
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`rounded-full p-3 ${
                          order.delivery_status === "delivered"
                            ? "bg-primary"
                            : "bg-gray-200"
                        }`}
                      >
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-xs mt-2 text-center font-medium">
                        Delivered
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Delivery Address</h3>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name}
                      <br />
                      {order.shipping_address_line1}
                      <br />
                      {order.shipping_address_line2 && (
                        <>
                          {order.shipping_address_line2}
                          <br />
                        </>
                      )}
                      {order.shipping_city}, {order.shipping_postal_code}
                      <br />
                      {order.shipping_country}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Estimated Delivery</h3>
                    <p className="text-sm text-muted-foreground">
                      {order.delivered_at
                        ? `Delivered on ${formatDate(order.delivered_at)}`
                        : `Expected by ${formatDate(
                            order.estimated_delivery_date
                          )}`}
                    </p>
                    <h3 className="font-semibold mb-2 mt-4">Order Total</h3>
                    <p className="text-lg font-bold text-primary">
                      £{Number(order.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 justify-center">
              <Link to="/products">
                <Button variant="outline">Continue Shopping</Button>
              </Link>
              <Link to="/">
                <Button>Back to Home</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrderTracking;
