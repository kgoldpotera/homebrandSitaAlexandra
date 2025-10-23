import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminProductForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [outOfStock, setOutOfStock] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

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
    enabled: isAdmin,
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
    enabled: isAdmin,
  });

  // Find if the selected category is "Brands"
  const brandsCategory = categories?.find(cat => cat.slug === "brands");
  const isBrandsCategory = categoryId === brandsCategory?.id;

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: isEditMode && isAdmin,
  });

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price.toString());
      setCategoryId(product.category_id || "");
      setBrandId(product.brand_id || "");
      setStockQuantity(product.stock_quantity.toString());
      setOutOfStock(product.out_of_stock);
      setImagePreview(product.image_url || "");
    }
  }, [product]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = imagePreview;
      
      if (imageFile) {
        imageUrl = await uploadImage() || imageUrl;
      }

      const productData = {
        name,
        description,
        price: parseFloat(price),
        category_id: categoryId || null,
        brand_id: brandId || null,
        stock_quantity: parseInt(stockQuantity),
        out_of_stock: outOfStock,
        image_url: imageUrl,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", id!);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Product ${isEditMode ? "updated" : "created"} successfully`,
      });
      navigate("/admin/products");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || (isEditMode && productLoading)) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">
          {isEditMode ? "Edit Product" : "Add New Product"}
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="image">Product Image</Label>
              <div className="mt-2">
                {imagePreview && (
                  <div className="mb-4 aspect-square max-w-xs bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {imagePreview ? "Change Image" : "Upload Image"}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter product description"
                rows={4}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (£) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={(value) => {
                setCategoryId(value);
                // Reset brand when category changes
                if (value !== brandsCategory?.id) {
                  setBrandId("");
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isBrandsCategory && (
              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands?.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="out-of-stock">Out of Stock</Label>
                <p className="text-sm text-muted-foreground">
                  Mark this product as unavailable
                </p>
              </div>
              <Switch
                id="out-of-stock"
                checked={outOfStock}
                onCheckedChange={setOutOfStock}
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !name || !price}
                className="flex-1"
              >
                {saveMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Update Product" : "Create Product"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/products")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminProductForm;
