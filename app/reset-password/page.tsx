import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-[600px]">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
