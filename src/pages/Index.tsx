import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: brands, isLoading: brandsLoading } = useQuery({
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

  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("out_of_stock", false)
        .limit(8);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[600px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBanner})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/90 to-primary-dark/50" />
        </div>
        
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl text-primary-dark-foreground">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              DON'T TELL THEM<br />OUR SECRET
            </h1>
            <p className="text-2xl mb-8">Cellulite Balm</p>
            <Link to="/products">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8">
                Shop Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Countdown Timer */}
      <section className="bg-primary-dark text-primary-dark-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xl mb-4">Affordable shopping during the cool hours! 10% extra discount for you.</p>
          <div className="flex justify-center gap-8">
            <div>
              <div className="text-4xl font-bold">31</div>
              <div className="text-sm">days</div>
            </div>
            <div>
              <div className="text-4xl font-bold">04</div>
              <div className="text-sm">hours</div>
            </div>
            <div>
              <div className="text-4xl font-bold">59</div>
              <div className="text-sm">minutes</div>
            </div>
            <div>
              <div className="text-4xl font-bold">08</div>
              <div className="text-sm">seconds</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Shop Categories</h2>
          
          {categoriesLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {categories?.map((category) => (
                <Link key={category.id} to={`/products?category=${category.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className="w-full aspect-square bg-secondary rounded-lg mb-4 flex items-center justify-center">
                        <span className="text-4xl">{category.name[0]}</span>
                      </div>
                      <h3 className="font-semibold">{category.name}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Brands Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Shop Brands</h2>
          
          {brandsLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {brands?.map((brand) => (
                <Link key={brand.id} to={`/products?brand=${brand.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className="w-full aspect-square bg-secondary rounded-lg mb-4 flex items-center justify-center">
                        {brand.image_url ? (
                          <img 
                            src={brand.image_url} 
                            alt={brand.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-4xl">{brand.name[0]}</span>
                        )}
                      </div>
                      <h3 className="font-semibold">{brand.name}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-secondary">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Featured Products</h2>
          
          {productsLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts?.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
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
                      <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-2xl font-bold text-primary">£{product.price}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Index;
