import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2, Plus } from "lucide-react";

const AdminProducts = () => {
  const { isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({
        title: "Product deleted",
        description: "The product has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Manage Products</h1>
          <Link to="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product) => (
              <Card key={product.id} className="relative">
                {product.out_of_stock && (
                  <Badge className="absolute top-4 right-4 z-10 bg-destructive">
                    Out of Stock
                  </Badge>
                )}
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-4 overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">
                      {product.categories?.name}
                    </p>
                    <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                    <p className="text-2xl font-bold text-primary">£{product.price}</p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {product.stock_quantity}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/admin/products/${product.id}/edit`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this product?")) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {products?.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-4">No products yet</p>
                <Link to="/admin/products/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Product
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminProducts;
