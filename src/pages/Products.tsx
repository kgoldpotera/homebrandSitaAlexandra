import { useState, useEffect } from "react";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  // Initialize from URL params
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    const brandParam = searchParams.get("brand");
    if (categoryParam) setSelectedCategory(categoryParam);
    if (brandParam) setSelectedBrand(brandParam);
  }, [searchParams]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", selectedCategory, selectedBrand],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name, slug), brands(name, slug)")
        .order("created_at", { ascending: false });
      
      if (selectedCategory !== "all") {
        const category = categories?.find(c => c.slug === selectedCategory);
        if (category) {
          query = query.eq("category_id", category.id);
        }
      }
      
      if (selectedBrand !== "all") {
        const brand = brands?.find(b => b.slug === selectedBrand);
        if (brand) {
          query = query.eq("brand_id", brand.id);
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
    enabled: !!categories && !!brands,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Shop All Products</h1>
          
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex gap-2 items-center">
              <label className="font-semibold">Category:</label>
              <Select value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value);
                setSearchParams(value === "all" ? {} : { category: value });
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 items-center">
              <label className="font-semibold">Brand:</label>
              <Select value={selectedBrand} onValueChange={(value) => {
                setSelectedBrand(value);
                setSearchParams(value === "all" ? {} : { brand: value });
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands?.map((brand) => (
                    <SelectItem key={brand.id} value={brand.slug}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
