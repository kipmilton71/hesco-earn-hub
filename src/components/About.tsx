import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, MapPin, Target, Users, TrendingUp, Award } from "lucide-react";

const About = () => {
  const features = [
    {
      icon: Shield,
      title: "Safe & Transparent",
      description: "Built with trust and transparency at our core"
    },
    {
      icon: MapPin,
      title: "Kenya Focused",
      description: "Designed specifically for the Kenyan market"
    },
    {
      icon: Target,
      title: "Simple Tasks",
      description: "Easy earning opportunities for everyone"
    }
  ];

  const stats = [
    { label: "Target Users Year 1", value: "5,000" },
    { label: "East Africa Expansion", value: "Year 3" },
    { label: "Platform Users Goal", value: "100K+" },
    { label: "Digital Empowerment", value: "Year 5" }
  ];

  return (
    <section id="about" className="py-20 bg-muted/30">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold">
                Empowering Kenya's Digital Future
              </h2>
              <p className="text-xl text-muted-foreground">
                Founded by Eng. Hess, Hesco Technologies is more than just a platform – 
                it's a movement to empower Kenyan youth and university students with 
                genuine online earning opportunities.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">Our Mission</h3>
              <p className="text-muted-foreground">
                We believe in creating a safe, scalable way for everyday people to generate 
                income online. With unemployment affecting young people across Kenya, we're 
                building accessible opportunities through technology and trust.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="flex justify-center">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-semibold">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <Card className="bg-gradient-primary p-8 text-white border-0">
              <CardContent className="p-0 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Our Vision</h3>
                  <p className="text-primary-foreground/90">
                    Transform from a platform to a comprehensive digital income company, 
                    offering tools, services, and financial empowerment across East Africa.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-primary-foreground/80">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">Future Expansion</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-secondary" />
                  <span>Hesco Digital Academy for training & affiliate programs</span>
                </li>
                <li className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                  <span>E-commerce platform for digital products</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-secondary" />
                  <span>B2B solutions for brands and businesses</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <Button size="lg" className="bg-gradient-secondary hover:shadow-glow transition-all duration-300">
            Join Our Community
          </Button>
        </div>
      </div>
    </section>
  );
};

export default About;