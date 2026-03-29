'use client';

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X } from "lucide-react";

/**
 * Navbar adapted for Next.js.
 * If on the home page, hash links scroll smoothly.
 * If on other pages, links navigate back to home.
 */
const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Architecture", href: "/#architecture" },
    { label: "Platform", href: "/#platform" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            zkCredential
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link href="/register">Register Pseudonym</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-6 py-4 space-y-2 animate-fade-up">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" asChild>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                Login
              </Link>
            </Button>
            <Button variant="default" size="sm" className="flex-1" asChild>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                Register
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
