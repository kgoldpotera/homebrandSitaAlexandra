import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Products = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || "all");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Organize categories into parent and children
  const parentCategories = categories?.filter(cat => !cat.parent_id) || [];
  const getSubcategories = (parentId: string) => 
    categories?.filter(cat => cat.parent_id === parentId) || [];

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name, slug)")
        .order("created_at", { ascending: false });
      
      if (selectedCategory !== "all") {
        const category = categories?.find(c => c.slug === selectedCategory);
        if (category) {
          query = query.eq("category_id", category.id);
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching products:", error);
        throw error;
      }
      
      console.log("Products fetched:", data?.length);
      return data;
    },
    enabled: !!categories,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Shop All Products</h1>
          
          <div className="flex gap-4 items-center">
            <label className="font-semibold">Filter by Category:</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {parentCategories.map((parent) => {
                  const subcats = getSubcategories(parent.id);
                  return (
                    <div key={parent.id}>
                      <SelectItem value={parent.slug}>
                        {parent.name}
                      </SelectItem>
                      {subcats.map((sub) => (
                        <SelectItem key={sub.id} value={sub.slug} className="pl-8">
                          ↳ {sub.name}
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products?.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>
                <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full relative">
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
                        className="w-full h-full object-contain"
                      />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {product.categories?.name}
                      </p>
                      <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                      <p className="text-2xl font-bold text-primary">£{product.price}</p>
                      {product.stock_quantity > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {product.stock_quantity} in stock
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            
            {products?.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No products found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Products;
