"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
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
import { LogOut, User, ChevronDown, Coffee, QrCode } from "lucide-react";

interface NavbarProps {
  isAuthenticated: boolean;
  email?: string;
  avatarUrl?: string;
}

export function Navbar({ isAuthenticated, email, avatarUrl }: NavbarProps) {
  const router = useRouter();
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
                      <Coffee className="h-4 w-4" />
                      Buy me a teh tarik! 
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 text-xs"
                    onSelect={() => setQrOpen(true)}
                    id="duitnow-qr-trigger"
                  >
                    <QrCode className="h-4 w-4" />
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
