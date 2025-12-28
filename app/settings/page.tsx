import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has a password set
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  const hasPassword = !!user?.password;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Settings
        </h1>

        <SettingsForm
          userEmail={session.user.email || ""}
          userName={session.user.name || ""}
          hasPassword={hasPassword}
        />
      </div>
    </div>
  );
}
