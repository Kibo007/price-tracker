"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TrackedProduct {
  id: number;
  url: string;
  productName: string | null;
  currentPrice: string | null;
  targetPrice: string;
  email: string;
  lastChecked: string | null;
  isActive: boolean;
  notified: boolean;
  createdAt: string;
}

interface ProductListProps {
  refreshTrigger: number;
}

export function ProductList({ refreshTrigger }: ProductListProps) {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error("Failed to load products");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [refreshTrigger]);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete product");
      toast.success("Product removed from tracking");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
      console.error(error);
    }
  };

  const truncateUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname.slice(0, 30) + "...";
    } catch {
      return url.slice(0, 50) + "...";
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "—";
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracked Products</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracked Products</CardTitle>
          <CardDescription>
            No products being tracked yet. Add one above!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracked Products</CardTitle>
        <CardDescription>
          {products.length} product{products.length !== 1 ? "s" : ""} being
          tracked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>Target Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Checked</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
                  >
                    {product.productName || truncateUrl(product.url)}
                  </a>
                </TableCell>
                <TableCell>{formatPrice(product.currentPrice)}</TableCell>
                <TableCell>{formatPrice(product.targetPrice)}</TableCell>
                <TableCell>
                  {product.notified ? (
                    <Badge variant="success">Notified</Badge>
                  ) : product.isActive ? (
                    <Badge variant="secondary">Tracking</Badge>
                  ) : (
                    <Badge variant="outline">Paused</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(product.lastChecked)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(product.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    <span className="sr-only">Remove</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
