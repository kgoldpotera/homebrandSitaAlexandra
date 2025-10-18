import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useCart } from "@/hooks/useCart";

const CheckoutSuccess = () => {
  const { refreshCart } = useCart();

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
            <p className="text-muted-foreground mb-8">
              You will receive an email confirmation with your order details and tracking information once your order has been shipped.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/products">
                <Button size="lg">Continue Shopping</Button>
              </Link>
              <Link to="/">
                <Button size="lg" variant="outline">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CheckoutSuccess;
