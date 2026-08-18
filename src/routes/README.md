# 📂 Routing Structure (TanStack Start)

SafeHer uses **TanStack Start's File-Based Routing**.

Every `.tsx` file inside the `src/routes` directory automatically becomes a route.
There is **no need** to manually configure routes.

> ⚠️ **Important**
>
> This project follows **TanStack Start conventions**, **not** Next.js or Remix.

### ❌ Do NOT create

```
src/pages/
src/routes/_app/index.tsx
app/layout.tsx
```

The **only root layout** for the entire application is:

```
src/routes/__root.tsx
```

This file acts as the global application shell and **must always render**:

```tsx
<Outlet />
```

---

# 📁 Route Naming Conventions

| Route File | URL Generated |
|------------|---------------|
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `login.tsx` | `/login` |
| `register.tsx` | `/register` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` |
| `posts/{-$category}.tsx` | `/posts/:category?` *(optional parameter)* |
| `files/$.tsx` | `/files/*` *(wildcard / splat route)* |
| `_layout.tsx` | Layout Route |
| `__root.tsx` | Global App Shell |

---

# 🔹 Dynamic Routes

Use **`$`** for dynamic parameters.

Example

```
users/$id.tsx
```

URL

```
/users/64b293
```

Access using

```tsx
const { id } = Route.useParams();
```

---

# 🔹 Optional Parameters

Use

```
{-$category}.tsx
```

Supports

```
/posts
/posts/security
/posts/news
```

---

# 🔹 Wildcard (Splat) Routes

Use

```
files/$.tsx
```

Matches

```
/files/documents/report.pdf
/files/images/profile.png
/files/anything/here
```

Read it with

```tsx
const { _splat } = Route.useParams();
```

> Never use `*` manually. TanStack Start automatically exposes it as `_splat`.

---

# 📐 Layout Routes

Shared UI like dashboards, sidebars, headers, and footers should be placed inside a layout route.

Example

```
admin/
│
├── _layout.tsx
├── dashboard.tsx
├── users.tsx
├── reports.tsx
```

`_layout.tsx` must render

```tsx
<Outlet />
```

so child pages appear correctly.

---

# 🌳 Root Layout

The application's global shell is

```
src/routes/__root.tsx
```

Responsibilities:

- React Query Provider
- Auth Provider
- Toast Notifications
- Global CSS
- HTML Head
- Error Boundary
- 404 Page
- `<Outlet />`

Every page in SafeHer is rendered inside this component.

---

# ⚙️ Auto Generated Route Tree

```
routeTree.gen.ts
```

This file is **generated automatically** by TanStack Router.

> ❌ Never edit this file manually.

It updates automatically whenever routes are added, renamed, or deleted.

---

# ✅ Best Practices

- Keep all routes inside `src/routes`.
- Prefer nested folders for related modules.
- Use layouts to avoid duplicate UI.
- Keep page components focused on one responsibility.
- Do not manually edit generated routing files.
- Follow TanStack Start naming conventions for maximum compatibility.

---

# 📌 SafeHer Routing Structure

```
src/routes
│
├── __root.tsx
├── index.tsx
├── login.tsx
├── register.tsx
│
├── admin
│   ├── index.tsx
│   ├── dashboard.tsx
│   ├── users.tsx
│   ├── volunteers.tsx
│   ├── monitoring.tsx
│   ├── safe-zones.tsx
│   └── reports.tsx
│
├── user
│   ├── index.tsx
│   ├── dashboard.tsx
│   ├── profile.tsx
│   ├── sos.tsx
│   ├── contacts.tsx
│   ├── history.tsx
│   └── safe-zones.tsx
│
└── volunteer
    ├── index.tsx
    ├── dashboard.tsx
    ├── alerts.tsx
    ├── incidents.tsx
    └── profile.tsx
```

This routing structure keeps the SafeHer application modular, scalable, and fully aligned with TanStack Start best practices.