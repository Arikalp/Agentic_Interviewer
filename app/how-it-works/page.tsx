"use client";

import Link from "next/link";

export default function HowItWorksPage() {
  const steps = [
    {
      number: "1",
      title: "Sign Up",
      description: "Create your free Intervo account in seconds with email or social login.",
      details: "No credit card required. You can start practicing immediately after signing up.",
    },
    {
      number: "2",
      title: "Upload Your Resume",
      description: "Make your profile complete by uploading your resume for AI-powered analysis.",
      details: "Our AI analyzes your resume to generate personalized interview questions.",
    },
    {
      number: "3",
      title: "Start Interview",
      description: "Begin your practice interview with AI-generated questions tailored to you.",
      details: "Questions are generated progressively from general to technical topics.",
    },
    {
      number: "4",
      title: "Record Your Answers",
      description: "Speak your answers clearly within the 30-second time window per question.",
      details: "Try to be concise and impactful, just like in a real interview.",
    },
    {
      number: "5",
      title: "Get AI Feedback",
      description: "Receive detailed scores, strength areas, and improvement suggestions.",
      details: "Feedback is generated instantly after answering each question.",
    },
    {
      number: "6",
      title: "Track Progress",
      description: "Monitor your interview history and see how your scores improve over time.",
      details: "Access your dashboard to view all past interviews and analytics.",
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">How It Works</h1>
          <p className="mt-4 text-lg text-zinc-400">Get started with Intervo in 6 simple steps</p>
        </div>
      </div>

      {/* Steps */}
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-6">
                {/* Step Number */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500">
                  <span className="font-bold text-white text-lg">{step.number}</span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-base text-zinc-300">{step.description}</p>
                  <p className="mt-2 text-sm text-zinc-500">{step.details}</p>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-24 h-8 w-1 bg-gradient-to-b from-orange-500/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold text-white">Why Intervo?</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: "🎯",
                title: "Personalized",
                text: "Questions are generated based on your resume and experience level.",
              },
              {
                emoji: "⚡",
                title: "Instant Feedback",
                text: "Get scores and detailed feedback immediately after each answer.",
              },
              {
                emoji: "📈",
                title: "Track Progress",
                text: "Monitor your improvement over time with comprehensive analytics.",
              },
              {
                emoji: "🔐",
                title: "Secure",
                text: "Your data is encrypted and stored securely with full privacy control.",
              },
              {
                emoji: "🤖",
                title: "AI-Powered",
                text: "Advanced AI evaluates your responses just like a real interviewer.",
              },
              {
                emoji: "♾️",
                title: "Unlimited Practice",
                text: "Practice as many interviews as you want, whenever you want.",
              },
            ].map((item, index) => (
              <div key={index} className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="text-3xl mb-3">{item.emoji}</div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-zinc-400">Start your first interview practice session today</p>
          <Link
            href="/interview"
            className="mt-8 inline-flex rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3 font-medium text-white transition-all hover:shadow-lg hover:shadow-orange-500/50"
          >
            Start Interview
          </Link>
        </div>
      </div>
    </div>
  );
}
