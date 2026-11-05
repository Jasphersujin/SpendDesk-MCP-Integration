# SpendDesk — Next.js + PostgreSQL starter

A runnable single-application MVP for multi-tenant spend requests, role-based access, approvals, audit events and a basic MCP-style HTTP endpoint.

## Important implementation note

This is a **local runnable MVP starter**, not a certified production system. It uses PostgreSQL through Prisma. It includes application-managed password hashing/JWT demo login so sample accounts work immediately. The product design document originally recommended Supabase Auth; this starter does **not** yet delegate login/password management to Supabase Auth. You can point `DATABASE_URL` and `DIRECT_URL` to a Supabase PostgreSQL database, but the application-managed auth remains in use. For production, integrate Supabase Auth, add verified invitation email delivery, implement RLS policies and use the official MCP SDK with the supported Streamable HTTP transport and OAuth/authentication model.

## Requirements

- Node.js 20.10+ (Node 22 LTS recommended)
- Docker Desktop (or an existing PostgreSQL 16 database)
- VS Code

## Run locally

1. Extract the ZIP and open the `spenddesk` folder in VS Code.
2. Copy `.env.example` to `.env`.
3. Keep the local PostgreSQL values or change them to your own PostgreSQL/Supabase connection strings.
4. Start PostgreSQL:

   ```bash
   docker compose up -d
   ```

5. Install dependencies:

   ```bash
   npm install
   ```

6. Generate Prisma client, create tables and seed demo data:

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

7. Start the application:

   ```bash
   npm run dev
   ```

8. Open http://localhost:3000

## Demo logins

Password for all seeded demo accounts: `Welcome123!`

| Role | Email |
|---|---|
| Super Admin | platform.admin@spenddesk.demo |
| Acme Organization Admin | ava.admin@acme.demo |
| Acme Employee | ethan.employee@acme.demo |
| Northstar Organization Admin | noah.admin@northstar.demo |
| Northstar Employee | mia.employee@northstar.demo |
| GreenLeaf Organization Admin | olivia.admin@greenleaf.demo |
| GreenLeaf Employee | liam.employee@greenleaf.demo |
| FinEdge Organization Admin | sophia.admin@finedge.demo |
| FinEdge Employee | lucas.employee@finedge.demo |
| Orbit Organization Admin | isabella.admin@orbit.demo |
| Orbit Employee | mason.employee@orbit.demo |

Demo organizations: Acme Technologies (MCP on), Northstar Manufacturing (MCP off), GreenLeaf Retail (MCP on), FinEdge Services (MCP off), Orbit Logistics (MCP on).

## What is implemented

- Login/logout and seeded sample accounts.
- Five organization records and tenant-specific admin/employee roles.
- Organization creation and organization-level MCP entitlement toggle (Super Admin).
- User creation with role assignment and tenant scoping.
- Database-driven seed for sidebar sections, menus, screens, actions, screen-action mappings and role permissions.
- Dashboard with request counts and recent request table.
- Spend request creation, detail page, eligible edit and approval/rejection/request-information flow.
- Department budget read view.
- Read-only audit log screen and event writes for key flows.
- Basic authenticated MCP HTTP JSON endpoint with `create_purchase_request` and `get_my_requests` tool-style calls.

## Pages

- `/dashboard`
- `/organizations` (Super Admin)
- `/users`
- `/access-control` (Super Admin)
- `/requests/new`
- `/requests/[id]`
- `/budgets`
- `/integrations`
- `/audit-logs`
- `/api/mcp`

## MCP demo endpoint caveat

The included `/api/mcp` route is a **minimal JSON HTTP adapter for local integration testing**, not a complete standards-compliant MCP server. It expects a bearer token whose SHA-256 hash exists in `McpConnection`. The seed intentionally does not create a reusable MCP bearer token. Add a secure, admin-controlled, one-time token issuance flow before testing it with a client. Do not expose this endpoint publicly as-is.

## Supabase PostgreSQL

Create a Supabase project, copy its PostgreSQL connection strings into `DATABASE_URL` and `DIRECT_URL`, then run:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

Use the transaction pooler URL for runtime if required by your Supabase plan, and the direct connection for Prisma schema operations. Keep credentials server-side. This project does not currently configure Supabase Storage, Supabase Auth, RLS policies or email invitations.

## Reset demo database

**Destructive — deletes existing database tables/data in the configured database:**

```bash
npm run db:reset
```

Only run this against a disposable local/demo database.

## Security / production gaps to close

- Replace demo application-managed authentication with Supabase Auth and secure invitation acceptance.
- Implement and test PostgreSQL RLS policies for every tenant-owned table.
- Add full CRUD editors for every System Configuration entity and a transactional role-permission matrix editor. The starter currently seeds the complete configuration model and provides a read-only matrix view; configuration editing UI is not yet complete.
- Implement user activation/disable, tokenized invitations, email delivery, password reset and MFA.
- Implement proper MCP SDK Streamable HTTP transport, OAuth/token issuance, per-tool RBAC, token revocation UI, request idempotency and rate limiting.
- Add full request state machine (draft/submit/action-required/cancel), comments, attachments, budget reservation/commitment accounting, multiple approval stages and export.
- Add CSRF/rate-limit hardening, security headers, structured observability, backups, retention and security review.
- Add unit, integration, RLS and Playwright E2E test suites.

## Troubleshooting

- `P1001` / cannot reach database: ensure Docker PostgreSQL is running (`docker compose ps`) and `.env` has the correct port/credentials.
- Prisma client missing: run `npm run db:generate`.
- Tables missing: run `npm run db:push` then `npm run db:seed`.
- Port 5432 busy: change the left side of the Docker port mapping and update `DATABASE_URL`.
- Login fails: rerun seed and use exact email plus `Welcome123!`.
