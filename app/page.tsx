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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Price Tracker
            </h1>
            <UserNav />
          </div>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Track product prices and get notified when they drop to your target
            price.
          </p>
        </header>

        <div className="space-y-8">
          <ProductForm onProductAdded={handleProductAdded} />
          <ProductList refreshTrigger={refreshTrigger} />
        </div>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>Powered by n8n automation</p>
        </footer>
      </div>
    </div>
  );
}
