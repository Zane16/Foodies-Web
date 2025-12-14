import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, ShoppingCart, Bike, ArrowRight, Sparkles, Users, Clock, CheckCircle2, Utensils } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-5xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 text-accent-foreground text-sm font-medium mb-8 animate-scale-in">
            <Sparkles className="w-4 h-4" />
            School Food Ordering Made Simple
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-balance mb-8 leading-[0.9]">
            Welcome to <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">Foodies</span>
          </h1>

          <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground mb-12 text-pretty max-w-4xl mx-auto leading-relaxed">
            Streamline food orders and ensure timely deliveries with our modern, efficient platform designed for school
            environments
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="#roles">
              <Button
                size="lg"
                className="text-lg px-8 py-4 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="#features">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-4 h-auto rounded-xl bg-transparent"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="roles" className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">Choose Your Role</h2>
            <p className="text-xl md:text-2xl text-muted-foreground text-pretty max-w-3xl mx-auto">
              Select your role to access the appropriate dashboard and features tailored for your needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-card to-accent/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="text-center pb-6 relative z-10">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold mb-3">Admin</CardTitle>
                <CardDescription className="text-lg leading-relaxed">
                  Monitor vendors, manage applications, and oversee the entire food ordering ecosystem with
                  comprehensive admin tools
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center relative z-10">
                <Link href="/admin/signin">
                  <Button className="w-full text-lg py-3 h-auto rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                    Access Admin Panel
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-card to-accent/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="text-center pb-6 relative z-10">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <ShoppingCart className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold mb-3">Vendor</CardTitle>
                <CardDescription className="text-lg leading-relaxed">
                  Manage your menu, add delicious items, edit pricing, and handle food orders with our intuitive vendor
                  dashboard
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center relative z-10">
                <Link href="/vendor/signin">
                  <Button className="w-full text-lg py-3 h-auto rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                    Manage Your Menu
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-card to-accent/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="text-center pb-6 relative z-10">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Bike className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold mb-3">Rider</CardTitle>
                <CardDescription className="text-lg leading-relaxed">
                  View delivery assignments, track your earnings, and manage your delivery schedule with real-time
                  updates and insights
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center relative z-10">
                <Link href="/rider/signin">
                  <Button className="w-full text-lg py-3 h-auto rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                    Start Delivering
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-card to-accent/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="text-center pb-6 relative z-10">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Utensils className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold mb-3">Customer</CardTitle>
                <CardDescription className="text-lg leading-relaxed">
                  Browse delicious menus, place orders from your favorite vendors, and track deliveries in real-time
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center relative z-10">
                <Link href="/customer/signin">
                  <Button className="w-full text-lg py-3 h-auto rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                    Order Now
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="w-full py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Why Choose Foodies?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built specifically for school environments with efficiency and ease of use in mind
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Fast & Efficient</h3>
              <p className="text-muted-foreground leading-relaxed">
                Streamlined ordering process ensures students get their meals quickly without long wait times
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Reliable Delivery</h3>
              <p className="text-muted-foreground leading-relaxed">
                Real-time tracking and dedicated delivery riders ensure your order arrives on time, every time
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Easy Management</h3>
              <p className="text-muted-foreground leading-relaxed">
                Intuitive dashboards for admins, vendors, and riders make managing the entire ecosystem effortless
              </p>
            </div>
          </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div>
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Foodies
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Modern food ordering platform designed for school environments
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-4 text-foreground">For Users</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link href="/customer/signin" className="hover:text-primary transition-colors">Order Food</Link></li>
                  <li><Link href="/vendor/signin" className="hover:text-primary transition-colors">Vendor Login</Link></li>
                  <li><Link href="/rider/signin" className="hover:text-primary transition-colors">Rider Login</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4 text-foreground">For Business</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link href="/admin/ApplicationForm" className="hover:text-primary transition-colors">Become a Vendor</Link></li>
                  <li><Link href="/rider/apply" className="hover:text-primary transition-colors">Join as Rider</Link></li>
                  <li><Link href="/admin/signin" className="hover:text-primary transition-colors">Admin Access</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4 text-foreground">Support</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link href="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
                  <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                  <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t pt-8 text-center">
              <p className="text-muted-foreground">
                © {new Date().getFullYear()} Foodies. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
