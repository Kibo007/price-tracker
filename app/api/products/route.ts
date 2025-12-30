import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const products = await prisma.trackedProduct.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { url, email, targetPrice, whatsapp } = body;

    if (!url || !email || targetPrice === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: url, email, targetPrice" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate target price
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: "Target price must be a positive number" },
        { status: 400 }
      );
    }

    const product = await prisma.trackedProduct.create({
      data: {
        url,
        email,
        targetPrice: price,
        whatsapp: whatsapp || null,
        userId: user.id,
      },
    });

    // Trigger immediate price check via n8n webhook
    try {
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
      if (n8nWebhookUrl) {
        fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id }),
        }).catch(() => {}); // Fire and forget
      }
    } catch {
      // Don't fail the request if webhook fails
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      { error: "Failed to add product" },
      { status: 500 }
    );
  }
}
