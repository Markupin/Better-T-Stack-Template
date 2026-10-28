import { createAuth } from "@better-t-stack-template/auth";
import { createDb } from "@better-t-stack-template/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
