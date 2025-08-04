import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, DollarSign } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-20 bg-gradient-primary text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-glow opacity-90"></div>
      
      <div className="container relative z-10">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold">
            Ready to Start Your Digital Journey?
          </h2>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Join thousands of Kenyans already earning through our platform. 
            Start with just KES 500 and unlock your earning potential today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <Smartphone className="mr-2 h-5 w-5" />
              Download App
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-primary"
              onClick={() => window.location.href = '/auth'}
            >
              Start Earning Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center pt-8 border-t border-white/20">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>M-Pesa Integration</span>
            </div>
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Mobile Optimized</span>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowRight className="h-5 w-5" />
              <span>Instant Withdrawals</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;