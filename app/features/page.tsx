"use client";

import Link from "next/link";

export default function FeaturesPage() {
  const features = [
    {
      title: "AI-Powered Questions",
      description: "Intelligent questions tailored to your experience level, covering technical and behavioral aspects.",
      icon: "🤖",
    },
    {
      title: "Real-time Feedback",
      description: "Get instant scores and detailed feedback on your interview performance and communication skills.",
      icon: "⚡",
    },
    {
      title: "Resume Analysis",
      description: "Upload your resume and get AI-powered insights to improve your profile and interview preparation.",
      icon: "📄",
    },
    {
      title: "Interview History",
      description: "Track all your interviews, view scores over time, and monitor your progress with detailed analytics.",
      icon: "📊",
    },
    {
      title: "30-Second Answers",
      description: "Practice concise, impactful answers within a 30-second timeframe for realistic interview conditions.",
      icon: "⏱️",
    },
    {
      title: "Secure & Private",
      description: "Your interview data is encrypted and stored securely. Complete control over your information.",
      icon: "🔒",
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
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Features</h1>
          <p className="mt-4 text-lg text-zinc-400">Everything you need to ace your interviews</p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-all hover:border-orange-500/50 hover:bg-white/10"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-4 text-lg text-zinc-400">Start practicing interviews with Intervo today</p>
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
