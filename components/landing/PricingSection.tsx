"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, Crown, BadgeCheck } from "lucide-react";

type PricingPlan = {
  name: string;
  price: string;
  subtitle: string;
  highlight?: boolean;
  icon: typeof Sparkles;
  features: string[];
  cta: string;
};

const pricingPlans: PricingPlan[] = [
  {
    name: "Classic",
    price: "Free",
    subtitle: "Start practicing with the essentials",
    icon: Sparkles,
    features: [
      "Basic mock interviews",
      "Resume-based question generation",
      "Limited interview sessions",
      "Standard feedback summary",
    ],
    cta: "Start Classic",
  },
  {
    name: "Pro",
    price: "₹59/month",
    subtitle: "For serious interview preparation",
    highlight: true,
    icon: BadgeCheck,
    features: [
      "Everything in Classic",
      "Advanced AI feedback",
      "Behavior analysis insights",
      "Interview scoring dashboard",
      "Unlimited practice sessions",
    ],
    cta: "Upgrade to Pro",
  },
  {
    name: "Elite",
    price: "₹99/month",
    subtitle: "The full interview mastery suite",
    icon: Crown,
    features: [
      "Everything in Pro",
      "Priority AI evaluation",
      "Deeper performance insights",
      "Premium interview roadmap",
      "Best for high-stakes job prep",
    ],
    cta: "Go Elite",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function PricingSection() {
  return (
    <section className="relative py-16 sm:py-20 md:py-24 overflow-x-hidden w-full">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/4 top-10 h-[260px] w-[260px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 h-[280px] w-[280px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-14 md:mb-16 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs sm:text-sm text-orange-300">
            <Sparkles className="h-3.5 w-3.5" />
            Choose a plan that fits your prep style
          </div>
          <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Simple Pricing for Every Interview Journey
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-zinc-400">
            Start free with Classic, level up with Pro, or unlock the full
            experience with Elite.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-5 lg:gap-6 grid-cols-1 md:grid-cols-3"
        >
          {pricingPlans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={cardVariants}
              className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 md:p-7 ${
                plan.highlight
                  ? "border-orange-500/40 bg-gradient-to-b from-orange-500/15 to-black/40 shadow-[0_0_0_1px_rgba(249,115,22,0.2),0_20px_60px_rgba(249,115,22,0.15)]"
                  : "border-zinc-800 bg-black/30"
              }`}
            >
              {plan.highlight ? (
                <div className="absolute right-4 top-4 rounded-full bg-orange-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
                  Most Popular
                </div>
              ) : null}

              <div className="mb-5 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${plan.highlight ? "bg-orange-500/20" : "bg-white/5"}`}>
                  <plan.icon className={`h-5 w-5 ${plan.highlight ? "text-orange-300" : "text-zinc-300"}`} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-xs sm:text-sm text-zinc-400">{plan.subtitle}</p>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  {plan.price}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500">Billed monthly</p>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.a
                href="/interview"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  plan.highlight
                    ? "bg-orange-500 text-white hover:bg-orange-400"
                    : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {plan.cta}
              </motion.a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}