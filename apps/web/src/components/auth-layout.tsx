import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@better-t-stack-template/ui/components/card";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { APP_NAME } from "@/lib/config";

import { ModeToggle } from "./mode-toggle";

/** Centered card layout shared by the auth pages. */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-semibold">
          {APP_NAME}
        </Link>
        <ModeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer && <CardFooter className="justify-center text-xs">{footer}</CardFooter>}
        </Card>
      </main>
    </div>
  );
}
