"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/auth-client";
import { AuthButton } from "@/components/auth/auth-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LogOut, User, ChevronDown } from "lucide-react";
import { motion } from "motion/react";

const AnimatedCoffee = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <motion.path
      d="M6 5 C 5 4, 7 3, 6 2"
      animate={{
        y: [0, -1, 0],
        opacity: [0.6, 1, 0.6],
        d: ["M6 5 C 5 4, 7 3, 6 2", "M6 5 C 7 4, 5 3, 6 2", "M6 5 C 5 4, 7 3, 6 2"]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.path
      d="M10 5 C 9 4, 11 3, 10 2"
      animate={{
        y: [0, -1, 0],
        opacity: [0.6, 1, 0.6],
        d: ["M10 5 C 9 4, 11 3, 10 2", "M10 5 C 11 4, 9 3, 10 2", "M10 5 C 9 4, 11 3, 10 2"]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
    />
    <motion.path
      d="M14 5 C 13 4, 15 3, 14 2"
      animate={{
        y: [0, -1, 0],
        opacity: [0.6, 1, 0.6],
        d: ["M14 5 C 13 4, 15 3, 14 2", "M14 5 C 15 4, 13 3, 14 2", "M14 5 C 13 4, 15 3, 14 2"]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
    />
  </svg>
);

const AnimatedQrCode = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="3" width="5" height="5" rx="1" />
    <rect x="16" y="3" width="5" height="5" rx="1" />
    <rect x="3" y="16" width="5" height="5" rx="1" />
    <path d="M21 16h-3a2 2 0 0 0-2 2v3" />

    <motion.path d="M21 21v.01" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} />
    <motion.path d="M12 7v3a2 2 0 0 1-2 2H7" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
    <motion.path d="M3 12h.01" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }} />
    <motion.path d="M12 3h.01" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.1 }} />
    <motion.path d="M12 16v.01" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }} />
    <motion.path d="M16 12h1" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.3, repeat: Infinity, delay: 0.7 }} />
    <motion.path d="M21 12v.01" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
    <motion.path d="M12 21v-1" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.7, repeat: Infinity, delay: 0.9 }} />
  </svg>
);

interface NavbarProps {
  isAuthenticated: boolean;
  email?: string;
  avatarUrl?: string;
}

export function Navbar({ isAuthenticated, email, avatarUrl }: NavbarProps) {
  const [qrOpen, setQrOpen] = useState(false);

  const handleLogout = async () => {
    await authClient.signOut();
    // Hard redirect to fully reset client-side React state
    window.location.href = "/";
  };

  const userInitial = email?.charAt(0).toUpperCase() ?? "U";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-xl">LangganCheck</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
              <Link href="/kira">Kira</Link>
            </Button>
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild id="user-menu-trigger">
                  <Button variant="ghost" className="gap-2 px-2 h-8">
                    <Avatar className="h-6 w-6">
                      {avatarUrl && (
                        <AvatarImage
                          src={avatarUrl}
                          alt={email ?? "User avatar"}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <AvatarFallback className="bg-muted text-xs font-medium">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:inline">
                      {email}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="gap-2" disabled>
                    <User className="h-4 w-4" />
                    <span className="truncate text-xs">{email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-xs" asChild>
                    <a
                      href="https://buymeacoffee.com/fiansuf"
                      target="_blank"
                      rel="noopener noreferrer"
                      id="bmc-link"
                    >
                      <AnimatedCoffee className="h-4 w-4" />
                      Belanja teh tarik satu!
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 text-xs"
                    onSelect={() => setQrOpen(true)}
                    id="duitnow-qr-trigger"
                  >
                    <AnimatedQrCode className="h-4 w-4" />
                    DuitNow QR
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive text-xs">
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <AuthButton />
            )}
          </nav>
        </div>
      </header>

      {/* DuitNow QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>DuitNow QR</DialogTitle>
            <DialogDescription>
              Scan to send a small donation — every ringgit helps! 🙏
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/duitnow-qr.jpeg"
              alt="DuitNow QR Code"
              className="w-full max-w-[240px] rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
