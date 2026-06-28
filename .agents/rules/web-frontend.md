---
description: Next.js frontend and shared UI component conventions
globs: apps/web/**,packages/ui/**
alwaysApply: false
---

# Web Frontend

## App Router

- Route groups: `(auth)/` for public pages, `(app)/` for protected shell (dashboard, transactions, email-sync).
- Middleware protects `/dashboard`, `/transactions`, `/email-sync` via `access_token` cookie.
- Server Components for layout auth (`getCurrentUser()`); Client Components for interactive UI.

## Data Fetching

- Use **React Query v5** for all list/mutation state — no Server Actions for API mutations.
- Axios client in `apps/web/lib/api-client.ts` with `withCredentials: true`.
- Centralize query keys in `lib/*.ts` (e.g. `transactionKeys.list(params)`).
- Toast notifications via **sonner**.

```typescript
// ✅ GOOD — React Query + axios
const { data } = useQuery({ queryKey: transactionKeys.list(params), queryFn: () => fetchTransactions(params) });

// ❌ BAD — Server Action calling API
async function createTransaction(formData: FormData) { 'use server'; ... }
```

## UI Components

- Import from `@repo/ui/*` subpaths: `@repo/ui/button`, `@repo/ui/dialog`, etc.
- Shared components live in `packages/ui/src/components/ui/` (Radix + CVA + `cn()`).
- Tailwind v4 with CSS variables in `globals.css`; dark mode via `next-themes`.

## Auth Flow

Google OAuth → api-backend callback sets httpOnly `access_token` cookie (never pass the JWT in a URL) → redirect to `WEB_URL/transactions` → axios sends credentials on subsequent requests. Logout goes through the API (`POST /auth/logout`) so the cookie is cleared with matching attributes (`COOKIE_DOMAIN` in production).
