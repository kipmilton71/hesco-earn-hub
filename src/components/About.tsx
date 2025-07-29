import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, MapPin, Target, Users, TrendingUp, Award } from "lucide-react";

const About = () => {
  const features = [
    {
      icon: Shield,
      title: "Globally Trusted",
      description: "Established in USA with proven track record across continents"
    },
    {
      icon: MapPin,
      title: "International Presence",
      description: "Operating in USA, UK, and now expanding to Kenya"
    },
    {
      icon: Target,
      title: "Proven System",
      description: "Time-tested opportunities that have enriched millions"
    }
  ];

  const stats = [
    { label: "Global Users Served", value: "1M+" },
    { label: "Countries Operating", value: "3+" },
    { label: "Kenya Target Year 1", value: "50K+" },
    { label: "Success Rate", value: "94%" }
  ];

  return (
    <section id="about" className="py-20 bg-muted/30">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold">
                From Silicon Valley to Kenya
              </h2>
              <p className="text-xl text-muted-foreground">
                Founded in the USA and established across the UK, Hesco Technologies has 
                empowered over 1 million users globally. Now we're bringing our proven 
                wealth-building system to Kenya's ambitious youth, investors, and entrepreneurs.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">Our Kenya Mission</h3>
              <p className="text-muted-foreground">
                Having successfully empowered millions in developed markets, we recognize Kenya's 
                incredible potential. We're here to provide the same opportunities that made our 
                USA and UK users financially independent - now tailored for Kenya's dynamic market.
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
                  <h3 className="text-2xl font-bold">Global Track Record</h3>
                  <p className="text-primary-foreground/90">
                    From our Silicon Valley headquarters to London offices, we've built a 
                    legacy of financial empowerment. Kenya represents our next chapter in 
                    creating global wealth opportunities.
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