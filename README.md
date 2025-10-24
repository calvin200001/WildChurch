# WildChurch Development Guide

## "Church in the wild, wherever you are" - Complete Free Tech Stack

---

## 🕊️ Executive Summary

WildChurch is a 100% free, offline-capable mobile-first platform designed to connect dispersed Christian communities in remote locations through crowdsourced mapping, real-time gatherings, and authentic fellowship.

This document serves as a comprehensive guide for developers, outlining the current state of the application, its architecture, implemented features, and instructions for deployment and future development.

---

## 🛠️ Tech Stack Architecture

### Core Infrastructure (All Free Forever)
-   **Hosting**: Netlify
-   **Database**: Supabase (PostgreSQL + PostGIS + Real-time)
-   **Auth**: Supabase Auth (to be implemented)
-   **Storage**: Supabase Storage (1GB free, compress images aggressively)
-   **Architecture**: JAMstack + Serverless Functions

### Frontend
-   **Framework**: React 18 + Vite
-   **State Management**: Zustand (lightweight, simple)
-   **Routing**: React Router v6
-   **Styling**: Tailwind CSS
-   **Form Management**: React Hook Form + Zod validation
-   **Map Renderer**: MapLibre GL JS (open source, no API keys)
-   **Map Integration**: `react-map-gl` v7
-   **Base Map Tiles**: Maptiler (free tier, CDN-hosted)
-   **User Layer**: Custom GeoJSON from Supabase PostGIS
-   **Offline Maps**: IndexedDB cached tiles + Service Worker (via `vite-plugin-pwa`)
-   **Geospatial Queries**: PostGIS (built into Supabase)

---

## 🗺️ Map Architecture Deep Dive

### Two-Layer System

```
┌─────────────────────────────────────────┐
│  USER LAYER (Your Data - Editable)     │
│  - Pins (camps, gatherings, quiet spots)│
│  - Custom notes and descriptions        │
│  - User-drawn paths/boundaries          │
│  - Comments and reviews                 │
│  ← Stored in Supabase PostGIS          │
├─────────────────────────────────────────┤
│  BASE LAYER (OpenStreetMap - Read-only)│
│  - Roads, trails, terrain               │
│  - National forest boundaries           │
│  - Water sources, peaks                 │
│  ← From Maptiler tiles                  │
└─────────────────────────────────────────┘
```

### Implemented Map Features:
-   **Base Map**: Maptiler streets-v2 style.
-   **User Pins**: Display of 'open_camp', 'gathering', 'quiet_place', and 'resource' pins.
-   **Pin Dropping**: Users can click on the map to propose gatherings or drop other pin types.
-   **Custom Icons**: Placeholder SVG icons for different pin types.
-   **WebGL Context Loss Handling**: The map is now resilient to WebGL context loss and will attempt to restore and re-render layers.

---

## 🗄️ Database Schema

The Supabase PostgreSQL database is configured with PostGIS for geospatial queries and Row Level Security (RLS) for secure data access.

### Key Tables & Features:

-   **`profiles`**: User profiles, linked to `auth.users`. Includes fields for `first_name`, `avatar_url`, `bio`, `testimony`, `interests`, `lifestyle`, `location_sharing`, `last_known_location`.
    -   **New**: `messaging_policy` (e.g., 'anyone', 'following', 'verified') and `role` (e.g., 'user', 'moderator', 'admin') columns for enhanced privacy and moderation.
-   **`locations`**: Stores all user-generated pins on the map.
    -   **New**: Supports `type`s: 'open_camp', 'gathering', 'quiet_place', and 'resource'.
-   **`pin_tags`**: Tags associated with `locations` for filtering and search.
-   **`pin_details`**: Extended information for specific pins.
-   **`custom_paths`**: For user-drawn paths (e.g., prayer walks).
-   **`pin_comments`**: Comment threads.
    -   **New**: Now supports comments on both `locations` and `meeting_proposals` via `location_id` or `proposal_id`. Includes `parent_id` for threading.
-   **`conversations`, `conversation_participants`, `messages`**: For private messaging.
-   **`follows`**: User following system.
-   **`safety_reviews`**: Positive-only review system for locations.
    -   **New**: `rating` now accepts 1-5 stars (with `visible` column for public display of 4-5 star reviews), `felt_safe` boolean.
-   **`notification_queue`**: For in-app notifications.
-   **`reports`**: For moderation.
    -   **New**: `action_taken` and `moderator_notes` columns for detailed moderation tracking.
-   **`prayer_requests`, `prayer_responses`**: Optional prayer features.
-   **`push_subscriptions`**: Stores user push notification subscriptions.
-   **`verifications` (New Table)**: Tracks user photo and host verification status.
-   **`moderation_actions` (New Table)**: Audit log for moderation actions.
-   **`meeting_proposals` (New Table)**: Stores proposed gatherings that require commitments before becoming a live `location` pin.
-   **`proposal_commitments` (New Table)**: Tracks users who commit to a `meeting_proposal`.
    -   Includes a PostgreSQL trigger (`check_proposal_confirmation`) to automatically create a `location` entry when 4 commitments are reached.

### SQL Migration Files:
-   `supabase/migrations/0000_initial_schema_corrected.sql`: Contains the initial schema with all core tables, RLS, and functions, including fixes for `IMMUTABLE` index errors.
-   `supabase/migrations/0002_proposals_and_resources.sql`: Adds the `meeting_proposals`, `proposal_commitments` tables, and updates `locations` for the 'resource' type.
-   `supabase/migrations/0003_proposal_comments.sql`: Modifies `pin_comments` to support comments on proposals and updates RLS.

---

## 🚀 Deployment Guide

### Netlify Configuration:
-   **Base directory**: Leave blank (or set to repository root).
-   **Build command**: `npm run build`
-   **Publish directory**: `dist`
-   **Redirects**: Configured in `netlify.toml` for SPA routing.
-   **Netlify Functions**: `netlify/functions` directory is configured in `netlify.toml`.

### Environment Variables (Netlify UI):
These **must** be set in your Netlify site settings under **Site configuration > Build & deploy > Environment > Environment variables**.

-   `VITE_SUPABASE_URL`: `https://xaikiqfgimpjggqyhlkm.supabase.co`
-   `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWtpcWZnaW1wamdncXlobGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTI1MDYsImV4cCI6MjA3Njg4ODUwNn0.czkT95dvPxJ1BqQtdVcSH1iFABUFs_UzYWJes_I9R8g`
-   `VITE_MAPTILER_API_KEY`: `vaWOg6IZ8M5qqoAqsDML`
-   `VITE_VAPID_PUBLIC_KEY`: (Your generated public VAPID key)
-   `VAPID_PRIVATE_KEY`: (Your generated private VAPID key - **no `VITE_` prefix**)
-   `SUPABASE_SERVICE_ROLE_KEY`: (Your Supabase service role key from project settings - **no `VITE_` prefix**)
-   `SITE_URL`: (The URL of your deployed Netlify site, e.g., `https://wildchurch.netlify.app`)

### Supabase Functions Deployment:
-   Deploy the Supabase Edge Function (`supabase/functions/notify-nearby-users`) using the Supabase CLI:
    ```bash
    supabase functions deploy notify-nearby-users --project-ref <your-supabase-project-id>
    ```

---

## ⚙️ Development Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/calvin200001/WildChurch.git
    cd WildChurch
    ```
2.  **Install Node.js**: Use Node.js v18. You can use `nvm` (Node Version Manager):
    ```bash
    nvm install 18
    nvm use 18
    ```
    (The project includes a `.nvmrc` file for convenience).
3.  **Install dependencies**:
    ```bash
    npm install --legacy-peer-deps
    ```
    (The `--legacy-peer-deps` flag is used to resolve some dependency conflicts).
4.  **Set up `.env.local`**: Create a `.env.local` file in the project root with your local development environment variables (same keys as Netlify, but you can use placeholder VAPID keys for local testing if push notifications aren't critical).
    ```
    VITE_SUPABASE_URL=https://xaikiqfgimpjggqyhlkm.supabase.co
    VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhaWtpcWZnaW1wamdncXlobGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTI1MDYsImV4cCI6MjA3Njg4ODUwNn0.czkT95dvPxJ1BqQtdVcSH1iFABUFs_UzYWJes_I9R8g
    VITE_MAPTILER_API_KEY=vaWOg6IZ8M5qqoAqsDML
    VITE_VAPID_PUBLIC_KEY=your-local-vapid-public-key
    VITE_SENTRY_DSN=your-sentry-dsn (optional)
    ```
5.  **Run the development server**:
    ```bash
    npm run dev
    ```

---

## 🚧 Next Steps: Authentication Implementation (Notes for the Dev)

**Goal**: Implement user authentication using Supabase (email/password) to enable user interaction and protect actions.

### Priority 1: Add Authentication 🔐

**Instructions for the Dev:**

"We need to add user authentication so people can sign up, log in, and interact with the app. Please implement:

1.  **Supabase Auth Setup**
    *   Use Supabase's built-in authentication (email/password for now).
    *   Add a login/signup modal or page.
    *   Store user session in the app.

2.  **UI Components Needed:**
    *   **Navigation bar**:
        *   "Sign Up" / "Log In" buttons (when logged out).
        *   User profile icon + "Log Out" button (when logged in).
        *   Link to "View Proposals" (already exists in `App.jsx` but needs to be integrated into the new nav).
    *   **Auth Modal/Page**:
        *   Sign up form (email, password, first name).
        *   Log in form (email, password).
        *   Switch between sign up/log in.

3.  **Protect Actions:**
    *   Currently, the RLS policies in the database protect actions like dropping pins, committing to proposals, and creating proposals.
    *   The frontend code already includes checks like `if (!user) { alert('You must be logged in...'); return; }`.
    *   Your task is to provide the actual login mechanism so `user` is populated.

4.  **Quick Implementation:**
    *   Create `src/components/Auth/AuthModal.jsx` (or `AuthPage.jsx`).
    *   Use Supabase's `signUp()` and `signIn()` methods (available via `supabase` client from `src/lib/supabase.js`).
    *   Add to `App.jsx` navigation.

5.  **Test Flow:**
    1.  User visits site → sees "Sign Up" button.
    2.  Clicks "Sign Up" → modal opens.
    3.  Enters email/password/name → account created.
    4.  Now logged in → can drop pins, commit to proposals.
    5.  Can log out and log back in.

### **Additional Notes for the Dev (Things to Look Out For):**

*   **Supabase Client**: The `supabase` client is already initialized in `src/lib/supabase.js`. You can import and use it directly.
*   **Session Management**: Use `supabase.auth.onAuthStateChange((event, session) => { ... })` to listen for authentication state changes and manage the user session within your React app (e.g., using React Context or Zustand for global state). This is crucial for updating the UI (nav bar, protected actions).
*   **User Profile Creation**: When a user signs up, you'll need to create a corresponding entry in the `profiles` table. Supabase has a feature called "Auth Hooks" or "Database Triggers" that can automatically create a `profiles` entry when a new user signs up via `auth.users`. This is the recommended approach.
    *   **Example Trigger (SQL):**
        ```sql
        -- In your Supabase SQL Editor
        CREATE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.profiles (id, first_name)
          VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name');
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        ```
        (You'll need to ensure `first_name` is passed in `signUp`'s `data` object).
*   **Protected Routes**: While the current actions are protected by RLS, you might want to implement client-side protected routes using `react-router-dom` (e.g., a `/profile` page only accessible when logged in).
*   **Roles**: The `profiles` table now has a `role` column (`user`, `moderator`, `admin`). For now, new users should default to `'user'`. This will be important for future moderation features.
*   **Push Notifications**: Remember that `VITE_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are needed for push notifications. The `push_subscriptions` table is ready.
*   **Privacy Settings**: The `profiles` table has `messaging_policy` and `location_sharing` for future privacy controls.
*   **Error Handling**: Implement robust error handling for all Supabase API calls (e.g., `try...catch` blocks).
*   **Loading States**: Show loading indicators during auth operations.

---

## 🐛 Known Issues / TODOs

*   **`viewPinDetails`**: Currently just an `alert()`. Needs a proper modal or page to display full pin details.
*   **User Profile Editing**: No UI for users to edit their `profiles` data yet.
*   **Image Uploads**: No functionality for image uploads (e.g., for `avatar_url` or pin photos).
*   **Gatherings Board Comments**: While the comments functionality is there, displaying user avatars and full profile details for comments is not yet implemented.
*   **WebGL Context Loss**: While handling is implemented, frequent context loss might indicate underlying browser/hardware issues.
*   **PWA Install Prompt**: Ensure the PWA install prompt appears correctly on supported devices.

---

This guide should provide a solid foundation for the next phase of development. Good luck!