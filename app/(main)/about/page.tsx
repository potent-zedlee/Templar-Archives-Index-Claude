import Link from "next/link"
import {
  Video,
  Database,
  Search,
  Users,
  Shield,
  FileText,
  Play,
  Newspaper,
  Radio,
  Phone,
  Mail,
  Trophy,
} from "lucide-react"

export default function AboutPage() {
  const features = [
    {
      icon: Database,
      title: "Hand Archive",
      description:
        "Comprehensive database of professional poker hands from major tournaments including WSOP, EPT, and Triton.",
    },
    {
      icon: Search,
      title: "Advanced Search",
      description:
        "Powerful search filters to find specific situations, players, or hand strengths in seconds.",
    },
    {
      icon: Users,
      title: "Player Profiles",
      description:
        "Track performance stats for professional players and compare strategies.",
    },
    {
      icon: Trophy,
      title: "Tournament Coverage",
      description:
        "Detailed hand histories from the world's most prestigious poker series and events.",
    },
    {
      icon: Newspaper,
      title: "Poker News",
      description:
        "Stay updated with the latest poker tournament announcements and community highlights.",
    },
    {
      icon: Radio,
      title: "Event Reports",
      description:
        "Tournament updates, chip counts, and results from ongoing events around the world.",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description:
        "Secure platform built with modern web standards to protect user data and preferences.",
    },
  ]

  const techStack = [
    { name: "Next.js 16", logo: "⚡" },
    { name: "React 19", logo: "⚛️" },
    { name: "Supabase", logo: "⚡" },
    { name: "Tailwind CSS", logo: "🎨" },
    { name: "TypeScript", logo: "📘" },
  ]

  const stats = [
    { value: "10,000+", label: "HANDS ARCHIVED" },
    { value: "500+", label: "PLAYERS TRACKED" },
    { value: "50+", label: "TOURNAMENTS" },
    { value: "100%", label: "MANUAL CURATION" },
  ]

  return (
    <div className="min-h-screen bg-black-0">
      <main className="container max-w-6xl mx-auto py-16 px-4 md:px-6">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <span className="text-caption border-2 border-gold-600 px-3 py-1 mb-4 inline-block">
            EST. 2024
          </span>
          <h1 className="text-display-lg mb-6 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 bg-clip-text text-transparent">
            TEMPLAR ARCHIVES INDEX
          </h1>
          <p className="text-body-lg text-text-secondary max-w-4xl mx-auto mb-8 leading-relaxed">
            The ultimate poker hand history archive.{" "}
            <span className="whitespace-nowrap">Built for players,</span>{" "}
            <span className="whitespace-nowrap">curated by experts.</span>
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/search" className="btn-primary">
              <Search className="h-5 w-5 mr-2" />
              SEARCH HANDS
            </Link>
            <Link href="/archive" className="btn-secondary">
              <FileText className="h-5 w-5 mr-2" />
              BROWSE ARCHIVE
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat) => (
            <div key={stat.label} className="card-postmodern p-6 text-center">
              <div className="text-heading mb-2 bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent font-mono">
                {stat.value}
              </div>
              <div className="text-caption text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="mb-16 text-center">
          <h2 className="text-heading-lg mb-4">OUR MISSION</h2>
          <p className="text-body text-text-secondary max-w-3xl mx-auto">
            To make professional poker hand history universally accessible and organized.
            We believe that studying high-stakes tournament play is the most effective path
            to mastering the game.
          </p>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-heading-lg text-center mb-12">FEATURES</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="card-postmodern p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 border-2 border-gold-600 flex items-center justify-center bg-black-100">
                      <Icon className="h-6 w-6 text-gold-400" />
                    </div>
                    <div>
                      <h3 className="text-caption-lg mb-2">{feature.title.toUpperCase()}</h3>
                      <p className="text-body text-text-muted">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-heading-lg text-center mb-12">PLATFORM ARCHITECTURE</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-gold-600 flex items-center justify-center mx-auto mb-4 bg-black-100">
                <Database className="h-8 w-8 text-gold-400" />
              </div>
              <h3 className="text-caption-lg mb-2">1. DATA AGGREGATION</h3>
              <p className="text-body text-text-muted">
                We collect and structure hand data from various tournament broadcasts and sessions.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-gold-600 flex items-center justify-center mx-auto mb-4 bg-black-100">
                <FileText className="h-8 w-8 text-gold-400" />
              </div>
              <h3 className="text-caption-lg mb-2">2. MANUAL CURATION</h3>
              <p className="text-body text-text-muted">
                Every hand is reviewed and tagged to ensure maximum accuracy and relevance.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-gold-600 flex items-center justify-center mx-auto mb-4 bg-black-100">
                <Search className="h-8 w-8 text-gold-400" />
              </div>
              <h3 className="text-caption-lg mb-2">3. SEARCH & STUDY</h3>
              <p className="text-body text-text-muted">
                Users can easily find specific spots and study how the world's best players react.
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-16">
          <h2 className="text-heading-lg text-center mb-8">BUILT WITH</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="card-postmodern px-6 py-3 flex items-center gap-3"
              >
                <span className="text-2xl">{tech.logo}</span>
                <span className="text-caption-lg">{tech.name.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-caption text-text-muted mt-8">
            Modern high-performance stack. See our{" "}
            <Link href="/legal/terms" className="text-gold-400 hover:text-gold-300">
              Terms of Service
            </Link>{" "}
            for details.
          </p>
        </div>

        {/* CTA Section */}
        <div className="card-postmodern p-12 text-center border-gold-600">
          <h2 className="text-heading-lg mb-4">START STUDYING TODAY</h2>
          <p className="text-body text-text-secondary mb-8 max-w-2xl mx-auto">
            Join players using Templar Archives Index to study poker hands from the world's best tournaments.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/login" className="btn-primary">
              <Play className="h-5 w-5 mr-2" />
              SIGN UP FREE
            </Link>
            <Link href="/search" className="btn-secondary">
              <Search className="h-5 w-5 mr-2" />
              EXPLORE HANDS
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-16">
          <h2 className="text-heading-lg text-center mb-8">CONTACT US</h2>
          <div className="max-w-2xl mx-auto">
            <div className="card-postmodern p-8">
              <div className="space-y-6">
                {/* Phone */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 border-2 border-gold-600 flex items-center justify-center bg-black-100">
                    <Phone className="h-6 w-6 text-gold-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-caption text-text-muted mb-1">PHONE</div>
                    <a
                      href="tel:+821023007653"
                      className="text-body-lg text-gold-400 hover:text-gold-300 font-mono"
                    >
                      +82 010 2300 7653
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 border-2 border-gold-600 flex items-center justify-center bg-black-100">
                    <Mail className="h-6 w-6 text-gold-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-caption text-text-muted mb-1">EMAIL</div>
                    <a
                      href="mailto:jhng.mov@gmail.com"
                      className="text-body-lg text-gold-400 hover:text-gold-300"
                    >
                      jhng.mov@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-6 border-t-2 border-gold-600">
                <a href="mailto:jhng.mov@gmail.com" className="w-full block">
                  <button className="btn-primary w-full">
                    <Mail className="h-5 w-5 mr-2" />
                    SEND US A MESSAGE
                  </button>
                </a>
              </div>
            </div>

            <p className="text-center text-caption text-text-muted mt-6">
              We typically respond within 24 hours
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
