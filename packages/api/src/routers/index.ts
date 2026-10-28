import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { accountRouter } from "./account";
import { adminRouter } from "./admin";
import { organizationRouter } from "./organization";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  account: accountRouter,
  admin: adminRouter,
  organization: organizationRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
