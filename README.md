# Better-T-Stack 模板（VPS 版）

一个可复用的 Web 应用基础模板：账号、组织、后台管理和权限都已经接好，新项目只需要写业务功能。

基于 [Better-T-Stack](https://www.better-t-stack.dev) CLI 生成，原则是 **只用框架（及其选定的库）本身提供的能力，框架没有的就不做**。所以这里没有 AI、文件存储、支付、示例代码、PWA/桌面/文档等插件，也没有 i18n 库。

## What's included（包含什么）

**账号（Better Auth 邮箱 + 密码）**

- 注册 / 登录 / 退出
- 邮箱验证（未验证不能登录；验证链接点开后自动登录）
- 忘记密码 / 重置密码（重置后吊销该用户所有会话）
- 个人设置：修改名字、修改密码（同时退出其他会话）
- 不含社交登录

**系统管理（Better Auth `admin` 插件）**

- 系统角色：`admin` / `user`
- 后台用户列表：搜索（名字或邮箱）、分页
- 设置角色、封禁 / 解封、模拟登录（impersonate）/ 退出模拟、吊销会话
- 统计卡片（用户数、封禁数、组织数）

**组织（Better Auth `organization` 插件）**

- 创建组织、切换当前组织（侧边栏组织切换器）
- 邀请成员（邀请链接打印在服务器日志）、接受 / 拒绝邀请
- 成员列表、修改成员角色（`owner` / `admin` / `member`）、移除成员、退出组织、修改组织名称

**权限守卫（前端 + 服务端双重）**

- 前端路由：`_auth/` 下所有页面需要登录（未登录跳转 `/login?redirect=...`）；`/admin` 仅系统管理员
- oRPC 中间件：`protectedProcedure`、`adminProcedure`、`orgProcedure` + `requireOrgRole(...)`
- Better Auth 自身的 admin / organization 接口在服务端强制校验权限

**UI（共享 shadcn/ui 包 `packages/ui`）**

- 落地页、登录、注册、验证邮箱提示、忘记 / 重置密码、接受邀请页
- 控制台布局：侧边栏 + 组织切换器 + 用户菜单 + 模拟登录提示条
- 设置页、组织设置 / 成员页、后台用户页
- 深色模式切换（`next-themes`，生成器自带的依赖）

**工程**

- 首个管理员的 seed 脚本（读取环境变量）
- varlock 环境变量校验（`.env.schema`）+ `.env.example`
- Drizzle 迁移
- bun test 测试（真实 Postgres）
- Oxlint + Oxfmt，Lefthook 在 commit 时自动 lint / format
- 生产用 Dockerfile + docker compose（Postgres → 迁移 → Web）

## Stack（技术栈）

| 部分            | 选型                                                    |
| --------------- | ------------------------------------------------------- |
| 前端 / 全栈框架 | TanStack Start（`backend: self`，API 跑在同一个应用里） |
| API             | oRPC（附 OpenAPI 参考页 `/api/rpc/api-reference`）      |
| 认证            | Better Auth（email+password、admin、organization 插件） |
| 数据库 / ORM    | PostgreSQL + Drizzle                                    |
| UI              | Tailwind CSS v4 + shadcn/ui（Base UI）共享包            |
| 环境变量        | varlock（`.env.schema`）                                |
| Monorepo        | Turborepo + Bun workspaces                              |
| 代码质量        | Oxlint + Oxfmt + Lefthook                               |
| 测试            | bun test                                                |
| 部署            | Docker Compose（Better-T-Stack `--web-deploy docker`）  |

生成命令（`bts.jsonc` 中也有记录）：

```bash
bun create better-t-stack@latest better-t-stack-template \
  --frontend tanstack-start --backend self --runtime none \
  --database postgres --orm drizzle --api orpc --auth better-auth \
  --payments none --addons turborepo oxlint lefthook --examples none \
  --db-setup docker --web-deploy docker --server-deploy none \
  --git --package-manager bun
```

目录结构：

```
apps/web/                 TanStack Start 应用（页面、API 路由、seed 脚本）
  src/routes/             文件路由；_auth/ 下为需要登录的页面，_auth/admin/ 为后台
  src/components/         应用组件（侧边栏、组织切换器、表单等）
  src/services.ts         创建 db 和 auth 实例（服务端）
  .env.schema             环境变量定义与校验（varlock）
packages/api/             oRPC：procedure 与守卫（src/index.ts）、routers、测试
packages/auth/            Better Auth 配置、邮件接口、角色工具、seedAdmin
packages/db/              Drizzle schema、迁移、db 客户端
packages/ui/              共享 shadcn/ui 组件
packages/config/          共享 tsconfig
```

## Quick start（本地开发）

需要：Bun ≥ 1.3、Docker（本地跑 Postgres；也可以用自己的 Postgres）。

```bash
bun install

# 1. 配置环境变量
cp apps/web/.env.example apps/web/.env
#   把 BETTER_AUTH_SECRET 换成随机值：openssl rand -base64 32

# 2. 启动数据库（docker compose 里的 postgres 服务）
bun run db:start

# 3. 迁移
bun run db:migrate

# 4. 创建第一个管理员（读取 apps/web/.env 里的 SEED_ADMIN_*）
bun run db:seed

# 5. 开发
bun run dev
```

打开 http://localhost:3001 。注册后，验证链接会打印在 `bun run dev` 的终端里。

常用命令：

| 命令                    | 作用                                               |
| ----------------------- | -------------------------------------------------- |
| `bun run dev`           | 开发服务器（:3001）                                |
| `bun run build`         | 生产构建                                           |
| `bun run check-types`   | 全部包类型检查                                     |
| `bun run check`         | oxlint + oxfmt 检查（`bun run format` 自动格式化） |
| `bun run test`          | 测试（需要 Postgres，见下）                        |
| `bun run db:generate`   | 根据 schema 生成迁移（交互式，需在终端里运行）     |
| `bun run db:migrate`    | 执行迁移                                           |
| `bun run db:studio`     | Drizzle Studio                                     |
| `bun run db:seed`       | 创建 / 提升管理员                                  |
| `bun run auth:generate` | 修改 Better Auth 插件后重新生成 auth schema        |

### 测试

测试直接调用 Better Auth handler 和 oRPC router，连接真实 Postgres，每个测试文件开始时会执行迁移并清空表。默认库：

```
postgresql://postgres:password@localhost:5432/better-t-stack-template-test
```

先创建这个库（或设置 `TEST_DATABASE_URL`），然后：

```bash
docker exec -it better-t-stack-template-postgres createdb -U postgres better-t-stack-template-test
bun run test
```

覆盖：注册、登录 / 退出、验证与重置链接（日志）、seed、admin 守卫（未登录 401 / 非管理员 403）、列表搜索分页、设置角色、封禁 / 解封、模拟登录、吊销会话、组织创建 / 邀请 / 接受 / 改角色 / 移除 / 退出、组织角色守卫。

## Environment variables（环境变量）

定义在 `apps/web/.env.schema`（varlock 校验，启动和构建时不合法会直接报错），值放在 `apps/web/.env`（不入库）。修改 schema 后运行 `bun run env:generate` 重新生成类型 `src/env.ts`。

| 变量                  | 必填 | 说明                                                             |
| --------------------- | ---- | ---------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`  | 是   | 至少 32 位随机字符串，签名 cookie / token                        |
| `BETTER_AUTH_URL`     | 是   | 应用的公开地址（无结尾 `/`），也用于生成邮件链接和 CSRF 可信来源 |
| `DATABASE_URL`        | 是   | Postgres 连接串                                                  |
| `NODE_ENV`            | 否   | `development` / `production` / `test`                            |
| `SEED_ADMIN_EMAIL`    | 否   | `db:seed` 创建的管理员邮箱                                       |
| `SEED_ADMIN_PASSWORD` | 否   | 新建管理员的密码（用户已存在时忽略）                             |
| `SEED_ADMIN_NAME`     | 否   | 管理员名字，默认 `Admin`                                         |
| `TEST_DATABASE_URL`   | 否   | 测试库（只用于 `bun run test`）                                  |

根目录 `.env`（参考 `.env.example`）只给 docker compose 用：`POSTGRES_PASSWORD`、`WEB_PORT`。

> varlock 会把标记为 sensitive 的变量在日志里打码，并拦截包含这些值的响应。`BETTER_AUTH_URL`、`SEED_ADMIN_EMAIL`、`SEED_ADMIN_NAME` 因此标成了非敏感（它们本来就会出现在页面 / 日志里）。新增真正的密钥时保持默认（敏感）即可。

## How to add a feature（如何加一个新功能）

以"项目（project）"为例，属于当前组织。

**1. 新表** —— `packages/db/src/schema/project.ts`：

```ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "./auth";

export const project = pgTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

在 `packages/db/src/schema/index.ts` 里 `export * from "./project";`，然后：

```bash
bun run db:generate   # 生成 packages/db/src/migrations/<时间>_xxx
bun run db:migrate
```

**2. oRPC router** —— `packages/api/src/routers/project.ts`：

```ts
import { project } from "@better-t-stack-template/db/schema/project";
import { eq } from "drizzle-orm";
import z from "zod";

import { orgProcedure, requireOrgRole } from "../index";

export const projectRouter = {
  // 任何组织成员
  list: orgProcedure.handler(({ context }) =>
    context.db.select().from(project).where(eq(project.organizationId, context.organization.id)),
  ),
  // 仅 owner / admin
  create: orgProcedure
    .use(requireOrgRole("owner", "admin"))
    .input(z.object({ name: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const [row] = await context.db
        .insert(project)
        .values({ name: input.name, organizationId: context.organization.id })
        .returning();
      return row;
    }),
};
```

在 `packages/api/src/routers/index.ts` 的 `appRouter` 里加上 `project: projectRouter`。

可用的守卫（`packages/api/src/index.ts`）：

| Procedure                                | 要求                                                               | context 增加                           |
| ---------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| `publicProcedure`                        | 无                                                                 | —                                      |
| `protectedProcedure`                     | 已登录，否则 `UNAUTHORIZED`                                        | `session` 非空                         |
| `adminProcedure`                         | 系统管理员，否则 `FORBIDDEN`                                       | —                                      |
| `orgProcedure`                           | 有当前组织且是其成员（查库校验），否则 `BAD_REQUEST` / `FORBIDDEN` | `organization: { id, role, memberId }` |
| `.use(requireOrgRole("owner", "admin"))` | 组织角色之一，否则 `FORBIDDEN`                                     | —                                      |

**3. 页面** —— `apps/web/src/routes/_auth/projects.tsx`（放在 `_auth/` 下就自动需要登录，侧边栏菜单在 `src/components/app-sidebar.tsx` 的 `mainNav` 里加一项）：

```tsx
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = useQuery(orpc.project.list.queryOptions());
  return (
    <>
      <PageHeader title="Projects" />
      <ul>
        {projects.data?.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </>
  );
}
```

写操作用 `useMutation(orpc.project.create.mutationOptions())`。

**4. 前端守卫**

- 需要登录：放在 `routes/_auth/` 下即可（`_auth/route.tsx` 的 `beforeLoad`）
- 仅系统管理员：放在 `routes/_auth/admin/` 下，或在 `beforeLoad` 里用 `isSystemAdmin(context.session.user)`
- 组织角色：页面里读 `orpc.organization.current`（返回 `role`），用 `hasAnyRole(role, ["owner", "admin"])` 控制显示

前端守卫只是体验，**真正的权限必须在 oRPC procedure 上声明**。

**5. 测试** —— 参考 `packages/api/test/*.test.ts`，`createTestApp()` + `signUpVerified()` + `browser.rpc()` 拿到带会话的 oRPC client。

## Emails（邮件）

Better Auth 不发邮件，只提供钩子（`sendVerificationEmail`、`sendResetPassword`、`sendInvitationEmail`）。模板把它们接到一个很小的接口上（`packages/auth/src/email.ts`）：

```ts
export interface EmailSender {
  send(message: { to: string; subject: string; text: string; url: string }): Promise<void>;
}
```

默认实现 `consoleEmailSender` 把邮件（含链接）打印到服务器日志：

```
──────── [email] (console sender, no provider configured) ────────
To:      someone@example.com
Subject: Verify your email address
...
Link:    http://localhost:3001/api/auth/verify-email?token=...
```

**接入真实邮件服务**：实现 `EmailSender`，在 `apps/web/src/services.ts` 传进去即可，例如 Resend：

```ts
import type { EmailSender } from "@better-t-stack-template/auth";

const resendSender: EmailSender = {
  async send({ to, subject, text }) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: "App <noreply@your-domain.com>", to, subject, text }),
    });
  },
};

export const auth = createAuth(ENV, db, { email: resendSender });
```

记得在 `apps/web/.env.schema` 里加上 `RESEND_API_KEY`。邮件文案在 `emailTemplates`（同一文件）。

## Deploy to a VPS with Docker（VPS 部署）

沿用 Better-T-Stack 生成的 Docker 方案（[官方指南](https://www.better-t-stack.dev/docs/guides/docker)），在其基础上加了一个一次性的 `migrate` 服务：

```
postgres（健康检查）→ migrate（drizzle-kit migrate，跑完退出）→ web（:3001，健康检查 /api/auth/ok）
```

步骤（VPS 上已安装 Docker + Compose 插件）：

```bash
git clone <repo> app && cd app

# 1. 应用配置（构建时作为 BuildKit secret，运行时作为 env_file）
cp apps/web/.env.example apps/web/.env
#   BETTER_AUTH_SECRET=<openssl rand -base64 32>
#   BETTER_AUTH_URL=https://your-domain.com
#   DATABASE_URL 保持任意合法值即可，compose 会覆盖为 postgres 服务

# 2. compose 变量
cp .env.example .env
#   POSTGRES_PASSWORD=<长随机密码>

# 3. 构建并启动
bun run docker:up        # 等同 docker compose up -d --build

# 4. 创建管理员（一次性）
docker compose run --rm -e SEED_ADMIN_EMAIL=you@example.com -e SEED_ADMIN_PASSWORD='...' \
  web bun run db:seed
```

**反向代理 + HTTPS**：web 和 postgres 端口都只绑定在 `127.0.0.1`。在宿主机上用 Caddy（自动 HTTPS）：

```
# /etc/caddy/Caddyfile
your-domain.com {
  reverse_proxy 127.0.0.1:3001
}
```

`BETTER_AUTH_URL` 是 https 时，Better Auth 会自动给 cookie 加 `Secure`。

**其他**

- 更新：`git pull && bun run docker:up`（迁移会自动执行）
- 日志（含邮件链接）：`bun run docker:logs`
- 备份：数据在 volume `better-t-stack-template_postgres_data`；`docker compose down -v` 会删除数据
- 修改 `apps/web/.env` 后需要重新构建镜像（构建时会校验配置）

## 切换到 Cloudflare 版

计划中的 Cloudflare 变体（此处只记录方案，未实现）：

- **代码不变**：同样的 TanStack Start + oRPC + Better Auth + Drizzle + Postgres，业务代码、schema、迁移完全复用。
- **数据库**：Postgres 换成 [Neon](https://neon.tech)（Better-T-Stack `--db-setup neon`）。Workers 上需要用 Neon serverless / HTTP 驱动（或 Hyperdrive）替换 `packages/db/src/index.ts` 里的 `drizzle-orm/node-postgres`。
- **部署**：走 Better-T-Stack 的 Cloudflare / Alchemy 路径（`--web-deploy cloudflare`，见 [Deploying with Alchemy](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy)），nitro preset 从 `node-server` 换成 Cloudflare。
- **需要注意**：Better Auth 在 Workers 上的 secret / baseURL 走 Cloudflare 环境变量；默认的内存限流在多实例下不共享（可改用 Better Auth 的 secondary storage / 数据库限流）；不使用 Docker 相关文件。

## Security notes（安全说明）

- 所有权限在服务端强制：oRPC 守卫 + Better Auth 插件自身的权限检查；前端守卫只负责跳转。
- 保留 Better Auth 默认安全设置：HttpOnly + SameSite=Lax cookie（https 下 Secure）、Origin 校验（CSRF，仅信任 `BETTER_AUTH_URL`）、生产环境默认限流、scrypt 密码哈希、注册 / 找回密码不泄露邮箱是否存在。
- 会话 token 不会序列化到页面（`getUser` 去掉了 `session.token`）。
- 登录后的跳转只允许站内相对路径（`lib/redirect.ts`）。
- 邮件链接用 `BETTER_AUTH_URL` 拼接，不信任请求的 Host 头。
- `.env` 文件不入库；生产镜像以非 root 用户运行。
