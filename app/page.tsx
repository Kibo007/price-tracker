"use client";

import { useState } from "react";
import { ProductForm } from "@/components/product-form";
import { ProductList } from "@/components/product-list";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleProductAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Price Tracker
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
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
