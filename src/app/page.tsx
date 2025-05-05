import Link from "next/link";
import { Target, User, Play, Award, BarChart3, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            <span className="text-lg font-semibold">Dart Score Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">
                Log In
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">
                Sign Up
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-24 bg-gradient-to-b from-background to-background/80">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Target className="h-12 w-12 text-primary" />
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
              Master Your Dart Game
            </h1>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Track scores, follow games, and crown champions with our
              professional dart score management platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button asChild size="lg" className="gap-1">
                <Link href="/register">
                  <User className="h-5 w-5 mr-2" />
                  Create Account
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-1">
                <Link href="/login">
                  <Play className="h-5 w-5 mr-2" />
                  Log In
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Features
            </h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Everything you need to track and improve your dart game
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-primary/10 p-3 rounded-full">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Score Tracking</h3>
              <p className="text-muted-foreground">
                Track scores with precision during games with customizable game rules.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-primary/10 p-3 rounded-full">
                <LayoutList className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Game History</h3>
              <p className="text-muted-foreground">
                View your game history with detailed statistics and performance metrics.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-primary/10 p-3 rounded-full">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Multiple Game Modes</h3>
              <p className="text-muted-foreground">
                Play with different rules including 501, 301, and custom starting scores.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-primary/10 p-3 rounded-full">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">User Profiles</h3>
              <p className="text-muted-foreground">
                Create and manage player profiles with personalized statistics.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-primary/10 p-3 rounded-full">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Performance Analytics</h3>
              <p className="text-muted-foreground">
                Analyze your performance with detailed charts and statistics.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-primary/10 p-3 rounded-full">
                <Play className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Quick Start</h3>
              <p className="text-muted-foreground">
                Start new games quickly with your preferred settings and players.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-24 bg-primary/5">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Ready to Improve Your Game?
            </h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Join thousands of dart enthusiasts and take your game to the next level.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button asChild size="lg" className="gap-1">
                <Link href="/register">
                  Get Started Now
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col gap-4 px-4 md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <span className="text-lg font-semibold">Dart Score Tracker</span>
            </div>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="#" className="hover:underline">
                Terms
              </Link>
              <Link href="#" className="hover:underline">
                Privacy
              </Link>
              <Link href="#" className="hover:underline">
                Contact
              </Link>
            </nav>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Dart Score Tracker. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
