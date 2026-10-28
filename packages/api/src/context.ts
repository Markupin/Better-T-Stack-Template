import type { Session } from "@better-t-stack-template/auth";
import type { Database } from "@better-t-stack-template/db";

export type Context = {
  session: Session | null;
  db: Database;
};
