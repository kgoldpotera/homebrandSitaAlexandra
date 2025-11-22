import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

// Import your specific sponsored images here
import promoMerch from "@/assets/promo-merch.jpg"; // The T-shirt/Hoodie image
import promoOutfit from "@/assets/promo-outfit.jpg"; // The Mannequin image
import promoFood from "@/assets/promo-food.jpg"; // The Burger/Garden Club image

// Helper to get fallback images for categories so we don't show letters
const getCategoryPlaceholder = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("beauty"))
    return "https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=400&h=400&fit=crop";
  if (n.includes("bag"))
    return "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop";
  if (n.includes("women"))
    return "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop";
  if (n.includes("men"))
    return "https://images.unsplash.com/photo-1488161628813-99c974fc5b11?w=400&h=400&fit=crop";
  if (n.includes("kid") || n.includes("bab"))
    return "https://images.unsplash.com/photo-1514095358583-d9b2d37a4585?w=400&h=400&fit=crop";
  if (n.includes("sport"))
    return "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop";

  // Default fallback for others
  return "https://images.unsplash.com/photo-1472851294608-415522184d44?w=400&h=400&fit=crop";
};

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
              DON'T TELL THEM
              <br />
              OUR SECRET
            </h1>
            <p className="text-2xl mb-8">Cellulite Balm</p>
            <Link to="/products">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8"
              >
                Shop Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Countdown Timer */}
      <section className="bg-primary-dark text-primary-dark-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xl mb-4">
            Affordable shopping during the cool hours! 10% extra discount for
            you.
          </p>
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
          <h2 className="text-4xl font-bold text-center mb-12">
            Shop Categories
          </h2>

          {categoriesLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {categories?.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.slug}`}
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                    <CardContent className="p-4 text-center">
                      <div className="w-full aspect-square bg-secondary rounded-lg mb-4 overflow-hidden">
                        <img
                          src={
                            category.image_url ||
                            getCategoryPlaceholder(category.name)
                          }
                          alt={category.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
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
                      <div className="w-full aspect-square bg-white rounded-lg mb-4 flex items-center justify-center overflow-hidden border">
                        {brand.image_url ? (
                          <img
                            src={brand.image_url}
                            alt={brand.name}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <img
                            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&h=300&fit=crop"
                            alt={brand.name}
                            className="w-full h-full object-cover opacity-80"
                          />
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
          <h2 className="text-4xl font-bold text-center mb-12">
            Featured Products
          </h2>

          {productsLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            // MODIFICATION: Changed grid-cols-1 to grid-cols-2 for mobile view
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts?.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full border-none">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-white rounded-lg mb-4 overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                            No image
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      {/* UPDATED: Responsive text size for better fit on mobile */}
                      <p className="text-lg md:text-2xl font-bold text-primary">
                        £{product.price}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sponsored Ads */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-primary-dark text-white py-2 px-6 inline-block mb-8 rounded-r-full shadow-md">
            <h2 className="text-2xl font-bold">Sponsored Ads</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Image 1: The Merchandise/Hoodies */}
            <div className="rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group">
              <img
                src={promoMerch}
                alt="Championship Stadium Concerts Merchandise"
                className="w-full h-[400px] object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Image 2: The Mannequin/Store */}
            <div className="rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group">
              <img
                src={promoOutfit}
                alt="Fashion Collection"
                className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Image 3: The Food/Club Flyer */}
            <div className="rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group">
              <img
                src={promoFood}
                alt="Garden Club Event"
                className="w-full h-[400px] object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;