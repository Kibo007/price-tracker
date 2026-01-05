"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { ProductList } from "@/components/product-list";
import { UserNav } from "@/components/user-nav";

export default function Home() {
  const { data: session, status } = useSession();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const handleProductAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative container mx-auto max-w-4xl px-4 py-8">
        <header className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Price Tracker
              </h1>
            </div>
            <UserNav />
          </div>
          <p className="text-center text-muted-foreground max-w-md mx-auto">
            Track product prices and get notified when they drop to your target
            price.
          </p>
        </header>

        <div className="space-y-8">
          <ProductForm onProductAdded={handleProductAdded} />
          <ProductList refreshTrigger={refreshTrigger} />
        </div>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Powered by n8n automation
          </p>
        </footer>
      </div>
    </div>
  );
}
