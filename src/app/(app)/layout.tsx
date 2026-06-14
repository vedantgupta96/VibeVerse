import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserMenu } from "@/components/layout/UserMenu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth beyond middleware: validate the real session here.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-10 mx-3 mt-3 flex items-center justify-between rounded-lg px-5 py-3">
          <span className="font-display text-lg font-medium tracking-tight md:hidden">
            Vibe<span className="text-gradient-aurora">Verse</span>
          </span>
          <span className="hidden md:block" />
          <UserMenu
            name={session.user.name}
            email={session.user.email}
          />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
