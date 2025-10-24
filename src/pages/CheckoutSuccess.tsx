import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Package } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useCart } from "@/hooks/useCart";

const CheckoutSuccess = () => {
  const { refreshCart } = useCart();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Clear the cart after successful checkout
    refreshCart();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Thank you for your order. We've received your payment and will begin processing your order shortly.
            </p>
            <p className="text-muted-foreground mb-4">
              You will receive an email confirmation with your order details and tracking information.
            </p>
            <div className="bg-muted p-4 rounded-lg mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="font-semibold">Track Your Order</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your tracking number will be sent to your email shortly. You can track your order anytime using the tracking page.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Link to="/track-order">
                <Button size="lg">
                  <Package className="mr-2 h-4 w-4" />
                  Track Order
                </Button>
              </Link>
              <Link to="/products">
                <Button size="lg" variant="outline">Continue Shopping</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CheckoutSuccess;
