"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DashboardNav } from "@/components/shared/dashboard-nav";
import { authOptions } from "@/lib/[...nextauth]";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the user session
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav user={session.user} />
      <main className="flex-1 container py-6">{children}</main>
    </div>
  );
}
