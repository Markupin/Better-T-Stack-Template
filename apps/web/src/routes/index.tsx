import { Button } from "@better-t-stack-template/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";

import { ModeToggle } from "@/components/mode-toggle";
import { getUser } from "@/functions/get-user";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/")({
  loader: async () => ({ session: await getUser() }),
  component: LandingPage,
});

function LandingPage() {
  const { session } = Route.useLoaderData();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-semibold">{APP_NAME}</span>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {session ? (
            <Button render={<Link to="/dashboard" />}>Dashboard</Button>
          ) : (
            <>
              <Button variant="ghost" render={<Link to="/login" />}>
                Sign in
              </Button>
              <Button render={<Link to="/signup" />}>Get started</Button>
            </>
          )}
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{APP_NAME}</h1>
        <p className="text-muted-foreground max-w-xl">
          A starting point with accounts, organizations and an admin area. Replace this page with
          your product.
        </p>
        <div className="flex gap-2">
          <Button size="lg" render={<Link to={session ? "/dashboard" : "/signup"} />}>
            {session ? "Go to dashboard" : "Create an account"}
          </Button>
        </div>
      </main>
      <footer className="text-muted-foreground px-6 py-4 text-center text-xs">
        © {new Date().getFullYear()} {APP_NAME}
      </footer>
    </div>
  );
}
