import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Shield, Repeat } from "lucide-react";
import { motion } from "framer-motion";

interface LandingPageProps {
  onLaunch: () => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="container px-4 md:px-6"
          >
            <div className="flex flex-col items-center space-y-4 text-center">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none"
              >
                Automated Crypto Transactions
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="mx-auto max-w-[700px] text-muted-foreground md:text-xl"
              >
                Schedule your crypto transactions with ease. Secure, reliable, and fully automated on the Injective chain.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <Button
                  className="inline-flex h-10 items-center justify-center rounded-md px-8 text-sm font-medium shadow transition-colors"
                  onClick={onLaunch}
                >
                  Launch App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="grid gap-6 lg:grid-cols-3 lg:gap-12"
            >
              {[
                {
                  icon: Clock,
                  title: "Scheduled Transactions",
                  description: "Set up recurring transactions at your preferred intervals"
                },
                {
                  icon: Shield,
                  title: "Secure Integration",
                  description: "Direct integration with Keplr wallet for maximum security"
                },
                {
                  icon: Repeat,
                  title: "Automated Recurring",
                  description: "Set and forget with our automated transaction system"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + (index * 0.2), duration: 0.6 }}
                  className="flex flex-col items-center space-y-4 text-center"
                >
                  <feature.icon className="h-12 w-12" />
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}