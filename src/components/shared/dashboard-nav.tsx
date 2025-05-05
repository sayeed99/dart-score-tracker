"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Target, User, LogOut, Menu, Home, Trophy, PlusCircle, BarChart } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  currentPath: string;
  onClick?: () => void;
}

function NavLink({ href, icon, text, currentPath, onClick }: NavLinkProps) {
  const isActive = currentPath === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent"
      }`}
    >
      {icon}
      {text}
    </Link>
  );
}

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : "U";

  const navLinks = [
    { href: "/dashboard", icon: <Home className="h-4 w-4" />, text: "Dashboard" },
    { href: "/dashboard/new-game", icon: <PlusCircle className="h-4 w-4" />, text: "New Game" },
    { href: "/dashboard/history", icon: <BarChart className="h-4 w-4" />, text: "Game History" },
    { href: "/dashboard/profile", icon: <User className="h-4 w-4" />, text: "Profile" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 py-4 font-semibold"
              >
                <Target className="h-6 w-6" />
                <span>Dart Score Tracker</span>
              </Link>
              <nav className="grid gap-2 py-4">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    href={link.href}
                    icon={link.icon}
                    text={link.text}
                    currentPath={pathname}
                  />
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Desktop Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Target className="h-6 w-6 hidden md:block" />
            <span className="hidden md:block">Dart Score Tracker</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="mx-6 hidden flex-1 items-center space-x-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              text={link.text}
              currentPath={pathname}
            />
          ))}
        </nav>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
