import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import HescoLogo from "./HescoLogo";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <HescoLogo size="md" />
        
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
            Pricing
          </a>
          <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">
            About
          </a>
        </nav>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/auth'}
            >
              Sign In
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
              onClick={() => window.location.href = '/auth'}
            >
              Get Started
            </Button>
          </div>
          
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-6 mt-6">
                <a href="#how-it-works" className="text-lg font-medium hover:text-primary transition-colors">
                  How It Works
                </a>
                <a href="#pricing" className="text-lg font-medium hover:text-primary transition-colors">
                  Pricing
                </a>
                <a href="#about" className="text-lg font-medium hover:text-primary transition-colors">
                  About
                </a>
                <div className="flex flex-col space-y-3 pt-6">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = '/auth'}
                  >
                    Sign In
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    onClick={() => window.location.href = '/auth'}
                  >
                    Get Started
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;