import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";

const CheckoutCancel = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-12 pb-12 text-center">
            <XCircle className="h-20 w-20 text-orange-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Payment Cancelled</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your payment was cancelled. Your items are still in your cart if you'd like to try again.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/cart">
                <Button size="lg">Return to Cart</Button>
              </Link>
              <Link to="/products">
                <Button size="lg" variant="outline">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CheckoutCancel;
