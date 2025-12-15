## django-react-template – Full Project Overview

This repository is a **batteries‑included Django + React template** for building secure, production‑ready web applications. It combines a **Django REST API** (with JWT authentication, Axes brute‑force protection, role‑based users, Celery, and optional Cloudinary/Redis) with a **React + Vite SPA** (with auth flows, protected routes, loading system, theming, and notifications).

This document explains:

- **Architecture and stack** (backend, frontend, infra).
- **Major features** of the template.
- Detailed explanation of **each backend module**.
- Detailed explanation of **each React component/page**.
- **Security measures** built in throughout the stack.

---

## 1. Architecture at a Glance

- **Monorepo layout**

  - `backend/` – Django project (`core`), apps (`users`, `api`), utilities, Celery, Docker config.
  - `frontend/` – React + Vite SPA, pages, components, context providers, utilities.

- **Data flow**

  1. Frontend (React) sends HTTP requests via `axios` to the backend (Django).
  2. Django exposes a JSON API under `/api/…` with authentication via JWT tokens.
  3. JWT **access/refresh tokens are stored in httpOnly secure cookies**.
  4. Frontend detects authentication state by calling `/api/users/get/` and storing user info in a **React context** (global state).
  5. Protected routes use this context to allow/deny access based on role and authentication.

- **Key concerns addressed**

  - Authentication and authorization.
  - Email verification + optional “2FA‑like” code step.
  - Brute‑force protection and lockouts (Django Axes).
  - Secure cookie usage, CSRF, HSTS, and other security headers.
  - Rate limiting and CORS.
  - Clean React UX with theming, spinners, confirmation dialogs, and notifications.

---

## 2. Tech Stack

### 2.1 Backend

- **Frameworks & Libraries**
  - Django 5.2
  - Django REST Framework (`rest_framework`)
  - `djangorestframework-simplejwt` (JWT auth)
  - `django-axes` (login attempt tracking and lockouts)
  - `django-cors-headers` (CORS controls)
  - `django-environ` (env‑based configuration)
  - `django_celery_results`, `django_celery_beat`, Celery (task queue)
  - `cloudinary`, `cloudinary_storage` (optional media hosting)
  - `django-redis` (production caching)

- **Storage & Infrastructure**
  - SQLite / PostgreSQL (depending on `DEBUG` and `DATABASE_URL`)
  - Redis (cache + Celery broker, especially in Docker)
  - Docker + `docker-compose` for containerized deployment

### 2.2 Frontend

- **Framework & Tooling**
  - React + Vite
  - `react-router-dom` (client‑side routing)
  - `axios` (HTTP client with interceptors)

- **UI & Utilities**
  - `sonner` (toast notifications)
  - `lucide-react` (icon set)
  - CSS Modules for scoped styling
  - Custom components: header, spinners, theme toggle, confirmation dialog, etc.

---

## 3. Backend: Core Project (`backend/core`)

### 3.1 `core/settings.py`

**Purpose:** Central configuration for Django, REST, JWT, security, email, Celery, Axes, CORS, Cloudinary.

**Highlights & Features:**

- **Environment‑driven configuration**
  - Uses `django-environ` and `.env`:
    - `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
    - `DATABASE_URL`
    - Email credentials (`EMAIL_*`, `DEFAULT_FROM_EMAIL`)
    - `IS_CLOUDINARY`, Cloudinary keys
    - `IS_TWOFA_MANDATORY` (global flag controlling mandatory email‑code verification)

- **Installed Apps**
  - Core Django apps: `django.contrib.*`
  - Third‑party:
    - `django_celery_results`, `django_celery_beat` – background jobs.
    - `cloudinary`, `cloudinary_storage` – optional media storage.
    - `axes` – brute‑force protection on login.
    - `rest_framework`, `rest_framework_simplejwt.token_blacklist`
    - `django_extensions` – dev utilities.
    - `corsheaders` – cross‑origin support.
  - Project apps: `users`, `api`.

- **Middleware Stack**
  - `corsheaders.middleware.CorsMiddleware`
  - `django.middleware.security.SecurityMiddleware`
  - Session, common, CSRF, auth, messages, clickjacking middleware.
  - `axes.middleware.AxesMiddleware` to monitor login attempts.

- **Databases**
  - In `DEBUG`:
    - Configured via `dj_database_url.config(default=env("DATABASE_URL"))`.
    - Example: simple SQLite or local Postgres.
  - In production:
    - Explicit Postgres settings (e.g. service name `postgres` for Docker).

- **Celery**
  - `CELERY_RESULT_BACKEND = "django-db"`, `CELERY_RESULT_EXTENDED = True`.
  - Coordinated with `core/celery.py`.

- **Password Validation**
  - `UserAttributeSimilarityValidator`
  - `MinimumLengthValidator`
  - `CommonPasswordValidator`
  - `NumericPasswordValidator`
  - **Security:** Encourages strong passwords.

- **Cloudinary media (optional)**
  - When `IS_CLOUDINARY` is `True`:
    - `SECURE_CONTENT_SECURITY_POLICY` restricted to `https://res.cloudinary.com`.
    - Configures Cloudinary storage and `DEFAULT_FILE_STORAGE`.
    - `MEDIA_URL = "/media/"`.

- **Caching & Sessions**
  - Dev: `LocMemCache`.
  - Production: Redis via `django_redis.cache.RedisCache`.
  - Session backend uses cache (`SESSION_ENGINE = "django.contrib.sessions.backends.cache"`).

- **Email settings**
  - All configurable via environment (`EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, etc.).
  - `EMAIL` and `DEFAULT_FROM_EMAIL` used in user‑facing emails (verification codes).

- **Django Axes**
  - `AXES_FAILURE_LIMIT = 40`
  - `AXES_COOLOFF_TIME = 60 * 1` (60 minutes).
  - `AXES_LOCK_OUT_AT_FAILURE = True`.
  - `AXES_IGNORE_IP_ADDRESSES` for local addresses.

- **Security Settings**
  - Cookies:
    - `CSRF_COOKIE_SECURE = True`
    - `SESSION_COOKIE_SECURE = True`
  - HSTS (forces HTTPS):
    - `SECURE_HSTS_SECONDS = 31536000`
    - `SECURE_HSTS_INCLUDE_SUBDOMAINS = True`
    - `SECURE_HSTS_PRELOAD = True`
  - HTTPS redirect:
    - `SECURE_SSL_REDIRECT = True`
  - Other security headers:
    - `SECURE_CONTENT_TYPE_NOSNIFF = True`
    - `SECURE_BROWSER_XSS_FILTER = True`
    - `X_FRAME_OPTIONS = "DENY"`
  - **Effect:** Strong browser‑side protections and HTTPS‑only behavior by default.

- **Authentication Backends**
  - `AUTHENTICATION_BACKENDS = [`
    - `"axes.backends.AxesBackend"`,  *(must be first)*
    - `"users.backends.EmailBackend"`,
    - `# "django.contrib.auth.backends.ModelBackend",`  *(optionally commented)*
    - `]`
  - **Feature:** All logins pass through Axes (for lockout) and then email‑based authentication.

- **DRF Configuration**
  - `DEFAULT_AUTHENTICATION_CLASSES`:
    - SessionAuthentication
    - TokenAuthentication
    - JWTAuthentication (for header‑based JWT)
  - `DEFAULT_PERMISSION_CLASSES`:
    - `AllowAny` (you tighten on specific views).
  - Rate limiting:
    - `AnonRateThrottle` (`"anon": "20/min"`)
    - `UserRateThrottle` (`"user": "100/min"`)

- **Simple JWT Settings**
  - Token lifetimes:
    - Access: 5 days.
    - Refresh: 7 days.
  - Refresh:
    - Rotates refresh tokens.
    - Blacklists old refresh tokens after rotation.
  - Cookie mode:
    - Config keys for `AUTH_COOKIE` and `AUTH_COOKIE_REFRESH` (names, secure, httpOnly, SameSite).
    - Note: In practice, the `users` app sets cookies named `"access"` and `"refresh"` manually, but the intent is still cookie‑based auth.

- **User Model & 2FA**
  - `AUTH_USER_MODEL = "users.User"`.
  - `IS_TWOFA_MANDATORY` controls whether every user must go through email code verification to activate and/or log in.

- **CORS Configuration**
  - `CORS_ALLOWED_ORIGINS` for local HTTPS dev.
  - `CORS_ALLOW_ALL_ORIGINS = True` (dev convenience; typically restricted in production).
  - `CORS_ALLOW_CREDENTIALS = True` to allow cookies from the front‑end.
  - Explicit lists of allowed headers and methods, including `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.

---

### 3.2 `core/urls.py`

- Routes:
  - `/admin/` → Django admin site.
  - `/api/` → includes `api.urls` (see the `api` app below).

All API endpoints are ultimately namespaced under `/api/`.

---

### 3.3 `core/celery.py`

- Creates a Celery app bound to Django settings:
  - Sets default `DJANGO_SETTINGS_MODULE = "core.settings"`.
  - `celery_app = Celery("core")`
  - `celery_app.config_from_object("django.conf:settings", namespace="CELERY")`
  - `celery_app.autodiscover_tasks()`

**Feature:** Ready‑made Celery configuration to add background tasks in any installed app.

---

## 4. Backend: Users App (`backend/users`)

The `users` app provides a **custom user model**, email verification, login/registration endpoints, a 2FA‑like verification step, and logout.

### 4.1 `models.py`

#### `User` model

- Inherits from `AbstractBaseUser`, `PermissionsMixin`.
- Fields:
  - `email` (unique, used as `USERNAME_FIELD`).
  - `username`.
  - `role` (choices: `"admin"`, `"staff"`, `"user"`).
  - `email_verified` (bool).
  - `twofa_endabled` (bool flag storing whether 2FA/email‑code is enabled).
  - `has_password` (bool).
  - `is_active`, `is_staff`.
  - `date_joined`.
- Manager: `UserManager`
  - `create_user(email, username, password, **extra_fields)`:
    - Normalizes email.
    - Hashes password via `set_password`.
  - `create_superuser(...)`:
    - Forces `is_staff=True`, `is_superuser=True`.

**Feature:** Central, extensible custom user with roles and flags.

**Security:**

- Email is the unique username; no plain‑text passwords are stored (hashed via `set_password`).
- Role enables role‑based permissions for endpoints.

#### `VerifyEmail` model

- One‑to‑one with `User` (one code per user).
- Fields:
  - `code` (6‑digit integer).
  - `created_at`.
- Methods:
  - `is_expired()` → checks if 5 minutes have passed since creation.
  - `save()` → auto‑generates a 6‑digit code on first save using `secrets.randbelow`.

**Feature:** Used for both signup verification and 2FA‑style login verification.

**Security:**

- Codes are short‑lived (5 minutes).
- One code per user; old entries are deleted before inserting new ones.

---

### 4.2 `serializers.py`

#### `UserSerializer`

- `ModelSerializer` for the `User` model.
- `fields = "__all__"` (all model fields).
- Overrides:
  - `create`:
    - Pops `password`, hashes with `set_password`, then saves user.
  - `update`:
    - If password present, also rehashes and saves.

**Security:** Password hashing is enforced on creation and update; raw passwords are never stored.

---

### 4.3 `backends.py`

#### `EmailBackend`

- Subclass of `ModelBackend`.
- `authenticate(self, request, email=None, password=None, **kwargs)`:
  - Looks up `User` by email.
  - If found and `check_password(password)` passes, returns the user.

**Feature:** Email‑based login instead of username.

**Security:** Combined with Axes, this backend supports secure, email‑only authentication.

---

### 4.4 `views.py` (Users Endpoints)

Uses DRF’s `APIView`, Simple JWT’s `RefreshToken`, a custom JWT auth class from `utils.auth`, and Django’s email utilities.

#### Shared objects

- `IS_TWOFA_MANDATORY` (from settings): toggles mandatory email verification on.
- `EMAIL` (from settings): sender address for verification emails.
- `Ax esProxyHandler`: used for checking user lockout status.

#### `GetUserView`

- `authentication_classes = [JWTCookieAuthentication]`
- `permission_classes = [IsAuthenticated]`
- `GET`:
  - If `user.is_authenticated`, returns serialized user data.
  - Else returns error.

**Feature:** Provides the current logged‑in user’s data to the front‑end based on JWT cookie.

**Security:** Only accessible when a valid JWT cookie is present and user is authenticated.

---

#### `SendVerificationCodeView`

- `authentication_classes = [JWTCookieAuthentication]`
- `POST`:
  - Rejects if the request is already authenticated.
  - Requires `email` in the body.
  - Checks if user with that email exists.
  - Deletes old `VerifyEmail` record for that user.
  - Creates new `VerifyEmail` and sends email with the code.
  - On success, returns message like `"verification code sent successfully."`.

**Feature:**
- Reusable endpoint for “send me an email code,” both for registration flows and login flows if needed.

**Security:**
- No code reuse; each request generates a fresh code and cleans up old ones.

---

#### `VerifyCodeView`

- `POST` with `email` and `code`.
- Validations:
  - Both `email` and `code` must be provided.
  - User must exist.
  - User must have a `VerifyEmail` record.
  - Provided code must match `VerifyEmail.code`.
  - `is_expired()` must be false; otherwise the code is invalid.
- In an atomic transaction:
  - Marks `user.is_active = True`.
  - Marks `user.email_verified = True`.
  - If `IS_TWOFA_MANDATORY`: sets the user’s 2FA flag to enabled.
  - Deletes the `VerifyEmail` record.
- Generates a JWT `RefreshToken` for the user.
- Sets response cookies:
  - `access` (access token), `refresh` (refresh token):
    - `httponly=True`, `secure=True`, `samesite="Lax"`.
  - `csrftoken`:
    - `httponly=False`, `secure=True`, `samesite="Lax"`.

**Features:**

- Used both to complete signup and to complete the 2FA email code step for login.
- Automatic login upon successful verification (tokens are issued and stored in cookies).

**Security:**

- 5‑minute expiry window and one‑time use codes.
- httpOnly cookies for tokens reduce exposure to XSS.
- Transaction ensures user state changes (activation, flags) and code deletion happen together.

---

#### `RegisterView`

- `POST` with `username`, `email`, `password`.
- Validations:
  - `email` required.
  - Must not already exist in DB.
- If serializer valid:
  - Transactionally:
    - Creates the user.
    - If `IS_TWOFA_MANDATORY`:
      - Sets `user.is_active = False` and `user.twofa_endabled = True`.
    - Saves user.
    - Creates a `VerifyEmail` record for the user.
  - Sends verification email with code.
  - Returns created user data and success message.
- On email sending failure:
  - Returns structured error with `email_sent: False`.

**Features:**

- Out‑of‑the‑box registration with email verification.
- Immediately prompts user to enter verification code in the front‑end.

**Security:**

- Prevents duplicate email accounts.
- Can keep account inactive until email verification is completed.

---

#### `LoginView`

- `POST` with `email` and `password`.
- Steps:
  1. Validate that email and password are present.
  2. Use `AxesProxyHandler` to check if this user is currently locked out due to too many failed attempts:
     - If locked: uses `get_lockout_remaining(email)` to compute remaining lockout time and returns a precise error message.
  3. Call `authenticate(request, email=email, password=password)` (using `EmailBackend`).
  4. If authentication fails:
     - Return `401` with `"Invalid email or password."`.
  5. If `IS_TWOFA_MANDATORY` or `user.twofa_endabled`:
     - Delete old `VerifyEmail` record (if any).
     - Create new `VerifyEmail`.
     - Send a verification email with the code.
     - Return `{ "detail": "verification code sent successfully.", "verify_email": true }` with `200`.
  6. Otherwise (no 2FA step needed):
     - Generate `RefreshToken` for user.
     - Set `access` and `refresh` cookies as in `VerifyCodeView`.
     - Generate and set `csrftoken` cookie.
     - Return minimal user data (id, email).

**Features:**

- **Flexible login flow:**
  - Normal login (if 2FA disabled).
  - 2FA‑like login (if either `IS_TWOFA_MANDATORY` or `twofa_endabled` is true) requiring an email code.

**Security:**

- Protected by **Django Axes** from brute force attacks.
- Uses JWTs in httpOnly cookies.
- Short‑lived 2FA codes for extra login security.

---

#### `LogoutView`

- `authentication_classes = [JWTCookieAuthentication]`
- `permission_classes = [IsAuthenticated]`
- `POST`:
  - Deletes `access`, `refresh`, and `csrftoken` cookies.
  - Returns `"Logged out successfully."`.

**Feature:** Clears authentication from the browser by removing the token cookies.

**Security:** Fully invalidates client-side session state (cookies removed).

---

### 4.5 `urls.py` (Users)

Maps users endpoints under `/api/users/`:

- `send-code/` → send verification code.
- `verify-code/` → verify code and authenticate.
- `register/` → registration endpoint.
- `login/` → login endpoint.
- `logout/` → logout endpoint.
- `get/` → get current authenticated user.

---

## 5. Backend: API App (`backend/api`)

Minimal general‑purpose API app to compose different resources.

- `urls.py`:
  - `path("users/", include("users.urls"))` – adds all users endpoints under `/api/users/`.
- `views.py`:
  - `test(request)` returns a plain `"Hi"` response.

**Feature:** A place to attach more domain‑specific endpoints under `/api/` (e.g., `/api/projects/`, `/api/posts/`, etc.).

---

## 6. Backend: Utils (`backend/utils`)

### 6.1 `auth.py`

#### `RolePermissionFactory(allowed_roles)`

- Returns a custom DRF `BasePermission` subclass that:
  - Checks `request.user.is_authenticated`.
  - Checks `user.role` is in `allowed_roles`.

**Feature:** Simple way to restrict an endpoint to roles:

```python
permission_classes = [RolePermissionFactory(["admin", "staff"])]
```

**Security:** Central, reusable role‑based access control.

#### `JWTCookieAuthentication`

- Extends `JWTAuthentication`:
  - Sets `cookie_name = "access"`.
  - Overrides `authenticate`:
    - Reads token from `request.COOKIES["access"]`.
    - If absent, returns `None`.
    - If present, validates token and returns `(user, validated_token)`.
    - On errors, raises `AuthenticationFailed("Invalid or expired token")`.

**Feature:** Cookie‑based JWT authentication instead of header‑based tokens.

**Security:** Encourages use of httpOnly secure cookies instead of `localStorage`.

---

### 6.2 `axes.py`

#### `get_lockout_remaining(email, ip_address=None)`

- Uses `AccessAttempt` entries from Django Axes to:
  - Find the latest login attempt for a given username (email).
  - Compute how many seconds remain in the `AXES_COOLOFF_TIME` window.
  - Return `(minutes, seconds)` remaining.

**Feature:** Used in `LoginView` to return user‑friendly lockout messages.

**Security:** Helps protect against brute force while giving clear feedback instead of generic “try again later”.

---

## 7. Frontend: App & Global Context

### 7.1 `src/App.jsx`

- Sets up app‑level routing with `react-router-dom`:

  - `/` → `Home`
  - `/login` → `Login`
  - `/register` → `Register`
  - `/verify-email` → `VerifyEmail`
  - Protected wrapper:
    - Uses `ProtectedRoute requiredRole={["admin", "staff", "user"]}`:
      - `/profile` → `Profile`
  - `*` → `NotFound`

- Renders `<NeonToast />` at the root to make toast notifications available globally.

**Feature:** Central routes definition, including protected profile route.

---

### 7.2 `src/Utils/api.js` (Axios client & interceptors)

- Creates default `axios` instance:

  ```js
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true,
  });
  ```

  - `withCredentials: true` ensures cookies (JWT and CSRF) are sent with requests.

- `setupAxiosInterceptors(setGlobalLoading, setComponentLoading)`:

  - **Request interceptor**:
    - If `config.method === "post"`:
      - `setGlobalLoading(true)` – triggers a **fullscreen spinner**.
    - Else if `config._componentId` is set:
      - `setComponentLoading(config._componentId, true)` – triggers a component‑local spinner.
  - **Response interceptor** (success and error):
    - Turns off `globalLoading` if method is POST.
    - Turns off per‑component loading if `_componentId` was set.
    - For errors, rethrows the error so callers can catch.

**Features:**

- Uniform way to show loading states for POST requests and specific components.
- Central config of API base URL and credentials.

---

### 7.3 `src/Context/UserContext.jsx` (User/Auth state)

- Provides a global `UserContext` with:
  - `user` object:
    - `isAuthenticated`
    - `role`
    - `email`
    - `emailVerified`
    - `twoFaEnabled`
    - `hasPassword`
    - `dateJoined`
    - `username`
  - `login(userData)` – to update state after login/verification.
  - `logout()` – to clear state and call backend logout.

**Key behaviors:**

- On mount (`useEffect`):
  - Calls `GET /api/users/get/` via `api`.
  - If 200 and `res.data.user`:
    - Sets `user.isAuthenticated = true` and maps backend fields to front‑end fields.
  - On error:
    - Sets `user.isAuthenticated = false`.

- `logout()`:
  - Calls `POST api/users/logout/`.
  - Navigates to `"login/"`.
  - Resets user state back to initial (null values).

**Features:**

- Central source of truth for auth state.
- Makes user data available to all components via `useUser()` hook.

**Security:**

- Uses backend’s `get` endpoint, which is protected by JWT cookie, to check logged‑in status.
- Ensures logout invocations clear server cookies and local context state.

---

### 7.4 `src/Context/LoaderContext.jsx` (Loading state)

- Defines `LoadingContext` with:
  - `globalLoading` + `setGlobalLoading` – for whole‑screen loading.
  - `componentLoadingMap` + `setComponentLoading` – per component (by ID).
  - `isComponentLoading(id)` – convenience function.

**Feature:**

- When wired with `setupAxiosInterceptors`, provides:
  - A fullscreen spinner for all POST requests (global).
  - Fine‑grained spinners for, e.g., a specific button or section (via `_componentId` in config).

---

## 8. Frontend: Reusable Components

### 8.1 `Header/Header.jsx`

- Contains:
  - Brand logo “DRT v1.0”.
  - Navigation:
    - “Docs” link (placeholder).
    - Link to `/verify-email`.
    - `<ThemeToggle />` button.
  - Right controls:
    - “Login” button linking to `/login` (with icon).
    - “Register” button linking to `/register`.
    - Mobile menu button toggling the nav menu (icons: `Menu`, `X`).

**Features:**

- Responsive top navigation/header.
- Integrates theme toggle and auth links.

---

### 8.2 `ThemeToggle/ThemeToggle.jsx`

- Manages a `theme` state (`light` or `dark`), initialized from `localStorage` key `"drtTheme"`.
- On toggle:
  - Updates local state.
  - Persists to `localStorage`.
  - Sets `document.documentElement`’s `data-theme` attribute (for CSS theming).
- Icon:
  - Shows `Moon` icon for light theme (to go dark).
  - Shows `Sun` icon for dark theme (to go light).

**Feature:** Simple persistent light/dark theme switch for the entire app.

---

### 8.3 `NeonToast/NeonToast.jsx`

- Uses `sonner`’s `<Toaster />` and `toast.custom()` to display custom neon‑styled toasts.

- `neonToast` object methods:
  - `neonToast.success(msg)`
  - `neonToast.error(msg)`
  - `neonToast.warning(msg)`
  - `neonToast.info(msg)`

Each method renders a styled `div` with a corresponding icon (`CheckCircle`, `XCircle`, `AlertTriangle`, `Info`) and message.

- Component:
  - `<NeonToast />` – simply renders `<Toaster richColors />`.

**Features:**

- Consistent, visually distinct toast notifications available globally.
- Used in all major flows: login, register, verify email, error messages.

---

### 8.4 Spinners

#### `FullScreenSpinner/FullScreenSpinner.jsx`

- Renders a fullscreen overlay with an SVG circular loader.
- Used when `globalLoading` is `true` in pages like `Login` and `Register`.

#### `GetSpinner/GetSpinner.jsx`

- Smaller, local spinner component (with adjustable `size`) using the same SVG structure.
- Used in `ProtectedRoute` while auth state is unknown.

#### `ImageSpinner/ImageSpinner.jsx`

- Displays a loader until the image finishes loading or errors:
  - Maintains `loading` state.
  - If loading: shows a CSS spinner.
  - When `<img>` fires `onLoad` or `onError`, hides spinner and shows/hides image.

**Features:**

- UX improvements during asynchronous operations or image loading.

---

### 8.5 `ProtectedRoute/ProtectedRoute.jsx`

- Accepts `requiredRole` array prop.
- Uses `useUser()` to get user state and `useLocation()` to know current route.
- Behavior:
  - If `user.isAuthenticated === null` → shows `GetSpinner` (loading).
  - If not authenticated or `user.role` not in `requiredRole`:
    - Redirects to `/login?next=<current_path>` using `<Navigate />`.
  - If allowed:
    - Renders `<Outlet />` so nested routes (e.g., `/profile`) are displayed.

**Feature:** Role‑based route protection integrated with `UserContext`.

**Security:** Ensures only authenticated users with suitable role can access protected views on the front‑end.

---

### 8.6 `ConfirmAction/ConfirmAction.jsx`

- Wraps any child element and prompts a confirmation dialog before executing an action.

**Props:**

- `children` – typically a `<button>` or similar click target.
- `title` – dialog title (default `"Are you sure?"`).
- `message` – explanation text.
- `confirmText`, `cancelText` – button labels.
- `onConfirm(event, reason)` – callback invoked if user confirms.
- `requireReason` – if `true`, requiring textual justification before confirmation.

**Behavior:**

- Clones the child element and injects `onClick` handler that:
  - Opens the modal.
  - Stores original event in `pendingEvent`.
- Modal:
  - Click outside closes it (backdrop detection).
  - If `requireReason` is true and `reason.trim() === ""`, confirm button is disabled.
- On confirm:
  - Closes modal.
  - Calls `onConfirm(pendingEvent, reason)` (supports async).
  - Clears `pendingEvent` and `reason`.

**Feature:** Reusable confirmation pattern; used in `Profile` for logout confirmation.

---

## 9. Frontend: Pages

### 9.1 `Home/Home.jsx`

- Renders:
  - `<Header />`.
  - Main content:
    - Title “DRT”.
    - Example `<ImageSpinner>` with an external image (Cristiano Ronaldo).

**Feature:** Landing page for the template; serves as an example of using header + components.

---

### 9.2 `Login/Login.jsx`

- Uses:
  - `ThemeToggle`, `FullScreenSpinner`, `LoadingContext`, `neonToast`.
  - `api` to post credentials to `api/users/login/`.
  - `useNavigate` for navigation.

**Behavior:**

- Local state: `email`, `password`.
- On submit:
  - Prevents default form submission.
  - Calls `api.post("api/users/login/", {email, password})`.
  - If response indicates `verify_email == true`:
    - Navigates to `/verify-email/?email=${email}` – 2FA/verification flow.
  - Otherwise:
    - Shows `"Login successfull!"` toast.
    - Reads `next` query parameter (if user was redirected) or defaults to `/profile`.
    - Navigates to that path.
- Error handling:
  - Checks `err.response?.data?.email_sent`:
    - If false: navigates to `/verify-email` and shows “Resend email!”.
  - Reads `err.response?.data?.error` or defaults to `"Something went wrong"` and shows via `neonToast.error`.

- Displays `<FullScreenSpinner />` when `globalLoading` is true.

**Features:**

- Handles both normal login and 2FA/email‑code login flows.
- Respects the `next` parameter for redirecting back to protected routes after login.

---

### 9.3 `Register/Register.jsx`

- Uses:
  - `ThemeToggle`, `FullScreenSpinner`, `LoadingContext`, `neonToast`.
  - `api` to post registration data.
  - `useNavigate`.

**Behavior:**

- Local state: `username`, `email`, `password`, `confirmPassword`.
- On submit:
  - Validates that passwords match; if not, shows toast error and aborts.
  - Posts to `api/users/register/`.
  - On success:
    - Shows `"Register successful!"` toast.
    - Navigates to `/verify-email/?email=${email}`.
  - On error:
    - Checks `email_sent` flag:
      - If false: navigate to verify email page and show “Resend email!”.
    - Otherwise shows backend error or fallback text.

**Features:**

- Complete registration + email verification workflow.
- Nice feedback with toasts and spinners.

---

### 9.4 `VerifyEmail/VerifyEmail.jsx`

- Uses:
  - `Header`, `FullScreenSpinner`, `LoadingContext`, `neonToast`, `useUser`.

**Behavior:**

- Local state: `code` (verification code).
- `handleVerify`:
  - Reads `email` from `location.search` query parameters.
  - Sanitizes by removing `/`.
  - Calls `POST /api/users/verify-code/` with `{ code, email }`.
  - On success:
    - Shows `"Login successfull"` toast.
    - Uses `user.login` to update global context from `res.data.user` (role, email, verification flags, etc.).
    - Navigates to `/profile`.
  - On failure:
    - Reads `err.response.data.error` and shows via `neonToast.error`.

- `handleResend`:
  - Reads `email` again from URL.
  - Calls `POST /api/users/send-code/` with `{ email }`.
  - On success: shows `"Verification code sent successfully."`.
  - On failure: shows error toast if provided.

- Displays `<FullScreenSpinner />` when `globalLoading` is true.

**Features:**

- Central page for both “verify your email after registration” and “enter 2FA login code”.
- Integrates tightly with the backend `VerifyCodeView` & `SendVerificationCodeView`.

**Security:**

- Uses shortest feasible path from verifying code to logging user in and setting context.
- Coordinates with JWT cookies set by backend.

---

### 9.5 `Profile/Profile.jsx`

- Uses:
  - `useUser` to get `user` and `logout`.
  - `useNavigate`.
  - `ConfirmAction` to guard logout.

**Behavior:**

- If `user.isAuthenticated === null`:
  - Shows a loading placeholder.
- If `user.isAuthenticated === false`:
  - Navigates to `/login` and renders nothing.
- Otherwise:
  - Shows:
    - Avatar circle with first letter of username.
    - Username, email.
    - Info cards:
      - Role.
      - Email verified status.
      - 2FA Enabled/Disabled.
      - Has password or not.
      - Joined date (formatted).
    - Action buttons: “Edit profile” and “Security” (example navigation to `/settings`, `/security`).

- Logout:
  - Wrapped in `ConfirmAction` with message `"Are you sure you want to logout."`.
  - `onConfirm` handler delegates to `logout()`, which:
    - Calls backend logout.
    - Navigates to login.
    - Clears user context.

**Features:**

- Example authenticated page that uses the full user object (role, verification flags, metadata).
- Demonstrates how to integrate `ConfirmAction`.

**Security:**

- Double check of auth state (redirect if unauthenticated).
- Uses context state which is backed by JWT cookies and backend validation.

---

## 10. Security Summary

This template builds in multiple layers of security:

- **Authentication & Authorization**
  - Custom `User` model with role field (`admin`, `staff`, `user`).
  - JWT auth with httpOnly, secure cookies for `access` and `refresh` tokens.
  - Central `JWTCookieAuthentication` for API views and `UserContext` on front‑end.
  - `RolePermissionFactory` utility for easy role‑based access in back‑end views.
  - ProtectedRoute in React for client‑side route guard.

- **Email Verification and 2FA‑like flow**
  - Timed, random 6‑digit codes stored in `VerifyEmail`, valid for 5 minutes.
  - Codes required for:
    - Completing user registration.
    - Logging in if `IS_TWOFA_MANDATORY` or user has 2FA enabled.
  - On verification, account can be activated and tokens are set in cookies.

- **Brute Force & Abusive Access Protection**
  - `django-axes` tracks login attempts and locks accounts after repeated failures.
  - `get_lockout_remaining` gives clear feedback about lockout durations.
  - DRF throttling:
    - Anonymous: 20 requests/minute.
    - Authenticated: 100 requests/minute.

- **Transport & Browser Security**
  - HTTPS‑only cookies for CSRF and session.
  - HSTS enabled with preload + include subdomains.
  - Automatic HTTP to HTTPS redirect.
  - X‑Frame‑Options = DENY (clickjacking prevention).
  - XSS filter and content type sniffing protections.

- **CORS & Credentials**
  - `corsheaders` configured to allow credentials (cookies) from front‑end domain(s).
  - Allowed origins and headers explicitly defined.

- **Password Security**
  - Django’s built‑in password validators for length, similarity, and common passwords.
  - Hashing via `set_password` in both serializer create/update and user manager create functions.

- **Separation of Secrets**
  - `django-environ` and env variables used for keys, DBs, email settings, etc.

---

## 11. How to Extend the Template

Some typical extensions you might add:

- **New backend resources**
  - Add models/serializers/views in `api` (or new apps).
  - Protect endpoints using:
    - `IsAuthenticated` and `JWTCookieAuthentication`.
    - `RolePermissionFactory(["admin"])` for admin‑only endpoints.

- **Additional frontend pages**
  - Add routes in `App.jsx`.
  - Use `ProtectedRoute` and `UserContext` to show/hide routes.
  - Use `axios` client `api` and `neonToast` for API integration and feedback.
  - Use `LoadingContext` / spinners where appropriate.

- **Advanced security**
  - Tighten CORS in production (`CORS_ALLOW_ALL_ORIGINS = False` and set specific origins).
  - Lower DRF throttle limits or provide per‑view custom throttles.
  - Use Celery to move email sending and heavy tasks out of request/response cycle.

---

This template gives you a solid, production‑ready starting point: **secure authentication, structured API, and a modern React front‑end** with all the common plumbing already in place."# IT-club" 
