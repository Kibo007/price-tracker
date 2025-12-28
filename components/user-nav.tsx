"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";

export function UserNav() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
        )}
        <span className="text-sm font-medium hidden sm:inline-block">
          {session.user.name || session.user.email}
        </span>
      </div>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/settings">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline-block ml-2">Settings</span>
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline-block ml-2">Sign out</span>
      </Button>
    </div>
  );
}
