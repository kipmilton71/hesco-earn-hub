import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Target, DollarSign, Smartphone } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: UserPlus,
      title: "Join & Refer",
      description: "Sign up with just KES 500 and start referring friends to build your network",
      color: "text-primary"
    },
    {
      icon: Target,
      title: "Complete Tasks",
      description: "Earn money by watching ads, completing surveys, and sharing content",
      color: "text-secondary"
    },
    {
      icon: DollarSign,
      title: "Earn Commissions", 
      description: "Get paid through our 3-level referral system and task bonuses",
      color: "text-accent"
    },
    {
      icon: Smartphone,
      title: "Withdraw to M-Pesa",
      description: "Cash out your earnings directly to your M-Pesa wallet instantly",
      color: "text-primary"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">How It Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start earning in 4 simple steps. Our platform makes it easy for anyone to generate income online.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="relative bg-card shadow-card border-0 hover:shadow-glow transition-all duration-300 group">
              <CardContent className="p-6 text-center space-y-4">
                <div className="relative">
                  <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br from-muted to-background group-hover:scale-110 transition-transform duration-300`}>
                    <step.icon className={`h-8 w-8 ${step.color}`} />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;