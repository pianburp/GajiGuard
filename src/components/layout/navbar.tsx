"use client";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, ChevronDown } from "lucide-react";

interface NavbarProps {
  isAuthenticated: boolean;
  email?: string;
}

export function Navbar({ isAuthenticated, email }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    // Hard redirect to fully reset client-side React state
    window.location.href = "/";
  };

  const userInitial = email?.charAt(0).toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-xl">GajiGuard</span>
        </Link>

        <nav className="flex items-center gap-1">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild id="user-menu-trigger">
                <Button variant="ghost" className="gap-2 px-2 h-8">
                  <Avatar className="h-6 w-6">
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
  );
}
