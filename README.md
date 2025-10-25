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

## ✅ Implemented Fixes & Improvements

This section summarizes the recent development efforts to address critical issues and enhance the application's stability and user experience.

*   **RPC Function for Pins (`get_pins_json`):** Provided SQL to create the `get_locations_geojson()` RPC function (later renamed to `get_pins_json`) in Supabase, essential for map pin data retrieval.
*   **User Profile Modal Loading:** Modified `UserProfileModal.jsx` to use `.maybeSingle()` for graceful profile loading, preventing the modal from hanging when a profile doesn't exist.
*   **Profile Loading Race Conditions:** Refactored profile fetching logic in `App.jsx` to consolidate calls, prevent race conditions, and ensure consistent loading states. This also included implementing auto-creation of profiles for new users.
*   **Header Component Profile Prop Handling:** Updated `App.jsx` and `Header.jsx` to consistently pass and handle `profile` and `profileLoading` props, ensuring correct display of user information and loading states in the header.
*   **Messaging System Stability:** Rewrote `fetchConversations` logic and `useEffect` dependencies in `ConversationList.jsx` to improve messaging stability and correct data fetching for conversation lists.
*   **UserSearch Component Import Fix:** Added the missing `User` icon import to `UserSearch.jsx`.
*   **Conversation View Avatar Display:** Modified message display to correctly show sender avatars and updated `fetchMessages` to include sender profile data in `ConversationView.jsx`.
*   **Global Loading States:** Created a reusable `ProfileLoading.jsx` component and integrated it into `ConversationList.jsx` to provide better visual feedback during data fetching.
*   **Robust Error Handling:** Created an `ErrorBoundary.jsx` component and wrapped the main `Routes` in `App.jsx` to provide a more robust error handling mechanism.
*   **Database Trigger for Auto-Profile Creation:** Provided SQL to create the `handle_new_user()` trigger in Supabase, automating profile creation for new users.
*   **Supabase Client Bypasses (Direct Fetch Implementations):** Due to persistent hanging issues with the `@supabase/supabase-js` client library, several key data fetching and storage operations have been transitioned to direct `fetch` API calls:
    *   `supabase.rpc('get_pins_json')` in `UserPinLayer.jsx` was replaced with a direct `fetch` call.
    *   `supabase.from('locations').select(...).single()` in `PinDetailsModal.jsx` was replaced with a direct `fetch` call.
    *   `supabase.from('profiles').select(...).maybeSingle()` in `UserProfileModal.jsx` was replaced with a direct `fetch` call.
    *   `supabase.storage.from('avatars').upload(...)` in `UserProfileModal.jsx` was replaced with a direct `fetch` call.
    *   `supabase.from('conversation_participants').select(...)` in `ConversationList.jsx` was replaced with a direct `fetch` call.

---

## 🚧 Remaining Issues & Future Enhancements

This section outlines known issues, areas for further investigation, and potential future enhancements.

*   **Supabase Client Library Investigation**: The recurring need to bypass the `@supabase/supabase-js` client library with direct `fetch` calls for various operations (RPC, `select`, storage) indicates a deeper underlying incompatibility or bug with the client library in this specific environment/setup. A thorough investigation into the root cause of these hanging issues is recommended.
*   **Remaining Supabase Client Usage Review**: All remaining uses of the `@supabase/supabase-js` client library should be reviewed. Specifically, the following functions still use the client and may require conversion to direct `fetch` calls if they exhibit similar hanging/failure behavior:
    *   `downloadImage` function in `UserProfileModal.jsx` (uses `supabase.storage.from('avatars').download(path)`).
    *   `updateProfile` function in `UserProfileModal.jsx` (uses `supabase.from('profiles').upsert(updates)`).
    *   `handleSendMessage` function in `ConversationView.jsx` (uses `supabase.from('messages').insert(...)`).
    *   `UserSearch` component's RPC calls (`supabase.rpc('search_profiles', ...)` and `supabase.rpc('create_or_get_conversation', ...)`).
    *   Image downloading in `Header.jsx`, `ConversationList.jsx`, and `ConversationView.jsx` (if they use `supabase.storage.from('avatars').getPublicUrl(...)` for actual download, not just URL generation).
*   **`viewPinDetails`**: Currently just an `alert()`. Needs a proper modal or page to display full pin details (though `PinDetailsModal` has been implemented, this might refer to further enhancements).
*   **Image Uploads**: While avatar upload is now functional via direct fetch, general image uploads (e.g., for pin photos) still need to be implemented.
*   **Gatherings Board Comments**: While the comments functionality is there, displaying user avatars and full profile details for comments is not yet fully implemented.
*   **WebGL Context Loss**: While handling is implemented, frequent context loss might indicate underlying browser/hardware issues that warrant further investigation.
*   **PWA Install Prompt**: Ensure the PWA install prompt appears correctly on supported devices.

---

This guide should provide a solid foundation for the next phase of development. Good luck!