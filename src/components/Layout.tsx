import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, LayoutDashboard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, signOut } = useAuth();
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Banner */}
      <div className="bg-primary-dark text-primary-dark-foreground text-center py-2 text-sm">
        20% OFF EVERYTHING - USE CODE: FLASH20 - ENDS SUNDAY
      </div>

      {/* Header */}
      <header className="bg-primary-dark text-primary-dark-foreground sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="SitaAlexandra" className="h-12 w-12" />
              <span className="font-bold text-xl">SitaAlexandra</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <Link to="/products" className="hover:text-primary transition-colors">
                Shop
              </Link>
              <Link to="/track-order" className="hover:text-primary transition-colors flex items-center gap-1">
                <Package className="h-4 w-4" />
                Track Order
              </Link>
              {isAdmin && (
                <Link to="/admin" className="hover:text-primary transition-colors flex items-center gap-1">
                  <LayoutDashboard className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative text-primary-dark-foreground hover:text-primary">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground">
                      {totalItems}
                    </Badge>
                  )}
                </Button>
              </Link>
              
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm hidden md:inline">{user.email}</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleSignOut}
                    className="text-primary-dark-foreground hover:text-primary"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button variant="ghost" size="icon" className="text-primary-dark-foreground hover:text-primary">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary-dark text-primary-dark-foreground py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 SitaAlexandra. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link to="/products" className="hover:text-primary transition-colors">Shop</Link>
            <Link to="/track-order" className="hover:text-primary transition-colors">Track Order</Link>
            <Link to="/auth" className="hover:text-primary transition-colors">Account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
