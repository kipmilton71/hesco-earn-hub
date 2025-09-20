import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Smartphone, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10"></div>
      
      <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center py-20">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Investment Platform</span> - Make Money Online with 
              <span className="text-primary"> HESCOTECH Kenya</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg">
              Join 1M+ users who trust Hesco Technologies globally. Proven tech investment platform now empowering 
              Kenyan investors and entrepreneurs to make money online with legitimate wealth-building opportunities.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300 w-full sm:w-auto" onClick={() => window.location.href = '/auth'}>
              Start Earning Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl font-bold">26,502</div>
              <div className="text-sm text-muted-foreground">Global Users</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Smartphone className="h-8 w-8 text-secondary" />
              </div>
              <div className="text-2xl font-bold">12,016</div>
              <div className="text-sm text-muted-foreground">Mobile app Downloads</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
              <div className="text-2xl font-bold">KES 3,000+</div>
              <div className="text-sm text-muted-foreground">Monthly Earnings</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-3xl opacity-20 scale-105"></div>
          <img 
            src={heroImage} 
            alt="HESCOTECH Kenya - Legit investment platform for making money online with proven tech investment opportunities" 
            className="relative rounded-2xl shadow-card w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;