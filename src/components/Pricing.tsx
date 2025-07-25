import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "KES 500",
      description: "Perfect for beginners",
      features: [
        "Basic task access",
        "1-level referral earnings", 
        "Weekly payouts",
        "WhatsApp support",
        "Basic training materials"
      ],
      popular: false
    },
    {
      name: "Amateur",
      price: "KES 1,000",
      description: "For growing your network",
      features: [
        "More task opportunities",
        "2-level referral earnings",
        "Bi-weekly payouts", 
        "Priority support",
        "Advanced training",
        "Bonus challenges"
      ],
      popular: false
    },
    {
      name: "Pro",
      price: "KES 2,000", 
      description: "For serious earners",
      features: [
        "Premium task access",
        "3-level referral earnings",
        "Daily payouts",
        "Dedicated support",
        "Pro training modules",
        "Exclusive bonuses",
        "Team building tools"
      ],
      popular: true
    },
    {
      name: "Elite",
      price: "KES 5,000",
      description: "Maximum earning potential",
      features: [
        "All premium features",
        "Maximum referral levels",
        "Instant payouts",
        "VIP support",
        "Leadership training",
        "Monthly bonuses",
        "Advanced analytics",
        "Personal mentor"
      ],
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">Choose Your Plan</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start with any plan and upgrade as you grow. All plans include M-Pesa withdrawals and full platform access.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative bg-card shadow-card border-0 hover:shadow-glow transition-all duration-300 ${
                plan.popular ? 'ring-2 ring-primary scale-105' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-primary">{plan.price}</div>
                <p className="text-muted-foreground">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-secondary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-gradient-primary hover:shadow-glow' 
                      : 'bg-gradient-secondary'
                  } transition-all duration-300`}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            All plans include our "Refer 3, Earn Your Fee Back" guarantee
          </p>
          <Button variant="outline" size="lg">
            Compare All Features
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;