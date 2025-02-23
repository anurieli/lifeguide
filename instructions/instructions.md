
# **LifeGuide - Project Overview**

# **1. Overview**
The **LifeGuide** platform is a personal development tool designed to help users organize their lives, define their identity, set meaningful goals, and build resilience. It is an interactive evolution based on the *Life Blueprint* Which is basically a very in-depth manual/form/questionnaire/guided journal that Works with the individual to map out who they are and what they aspire for and what they're aiming for in life in order to help them reach their goals.

This platform provides structured self-reflection exercises, progress tracking, and AI-driven feedback, allowing users to create their own *Life Blueprint*. The platform will be scalable, secure, and intuitive, enabling users to revisit and refine their personal development journey over time. And with the help of AI, we will be able to curate for them content and assistance based on the responses they have documented in their personal blueprint.

In terms of user flow and how this is going to work: I user creates an account, they get a brief explainer in card form about how this process is going to work, is then prompted to begin working on the blueprint, they begin working on a blueprint at their own pace, knowing that they must complete the sections in order and only once all the sections are complete Can they access their dashboard. And finally once have completed the blueprint, they are able to interact with their own AI buddy, as well as curate their dashboard to show them snippets of their blueprint, as well as always being able to view their finish blueprint (just the questions and responses).

---


# **Core Functionalities: Life Blueprint Platform**

## **1. User Dashboard**
The user dashboard, Which is only available to users were signed in, is the central hub where users interact with their personal blueprint. It consists of two main components: 

### **a. Blueprint Panel (Persistent)**
- **View Mode**: Always visible on the right side of the screen. It shows just the section, subsection, and their response. And when they hover over one of The subsections, a pop-up, explains the goal of the subsection (which is found in the subsections db table "description" column)
- **Edit Mode**: Expands into full screen when users wish to make detailed edits.
    - **Subsection Editing**:
    - Users can navigate between subsections seamlessly.
    - Each subsection contains:
        - **Title**
        - **Description**
        - **Example for guidance**
        - **Malleability Flag** (indicates if the section is flexible)
        - **User Input Field** (where users enter their thoughts)
    - Users save their edits using a **"Done" button** that collapses back to view mode.

### **b. Customizable Cards (Dynamic Section)**
- Users can generate **visual cards** that display their responses to blueprint subsections.
- These cards serve as quick, digestible summaries of key insights, .
- Features include:
  - **Add or Remove Cards** as needed.
  - **Drag and Drop Functionality** (potentially in a future update) for easy reordering.
  - **Cards can display different types of content** 

### **C. Settings panel **
- sign out
- email/mobile notification: Users will be able to opt in For automated emails, which they curate themselves:
    - They decide whether it's daily, weekly, or monthly
    - They decide what type of email they want, Based on preset options that I give them (ie. goals reminder)
    -and using AI I automatically curate an email for them every week.

---

## **2. Admin Dashboard**
The admin dashboard provides control over the core structure of the Life Blueprint. Only available if the current signed in member is using the admin email.

### **a. Traffic Monitoring**
- Displays real-time data and analytics, including:
  - Number of active users
  - Engagement levels per section
  - Most-used features
  - Click-through rates on interactive elements
  - Blueprint completion rates

### **b. Blueprint Management**
- **Global Edits**:
  - Admins can add, edit, or remove blueprint sections and subsections.
  - Changes reflect **universally for all users**.
- **Ordering and Organization**:
  - Ability to **reorder** sections for better guidance flow.
  - A simple drag-and-drop feature to make adjustments.
- **Content Updates**:
  - Admins can update **descriptions, examples, and malleability flags** for each subsection.
- **User Feedback Collection** (Planned Feature):
  - Admins can view feedback on blueprint sections and improve prompts based on user responses.

---

## ** 3.Public Blueprint Page**
The **Public Blueprint Page** is designed for engagement and inspiration. 

### **a. Showcase Completed Blueprints**
- Users can browse **example blueprints** created by **demo users**.
- These examples highlight key insights and encourage engagement.

### **b. Read-Only View for Guests**
- Users who haven’t signed up can **preview** how a blueprint looks.
- Call-to-action buttons prompt them to **create their own**.

---

## **4. Homepage: Landing + About Section**
The homepage provides an overview of the platform and its mission. The design of the homepage should show Clear differentiation between the sections.
- The homepage is designed to be **extremely intuitive** with:
  - **Directional arrows** guiding users to key sections.
  - **Quick links/scrolling/section indicater on the right hand side** that lets user know where they are on the page and quickly scrolls the user to that part of the page when clicked (home (hero), overview, about, contact ).show all sections, make the current one bold. T
  - **Smooth, dynamic scrolling** with elements moving into place in a fun way to maintain engagement.
  - **Landing pop-up note** : (for those that have never been to the site: "Ready to lock in?")

### **a. Hero **
- Title
- breif explainer
- persona Ribbon
- video introduction
- "So How Does this Work" button - scrolls to the "overview" section of homepage

### **b. Quick Overview **
- A **step-by-step summary** of how the platform works, carousel form with icons
  1. **Sign Up & Authenticate** – Users log in using Google OAuth.
  2. **Build Your Blueprint** – Users navigate structured sections and prompts.
  3. **Reflect & Customize** – Users refine their responses over time.
  4. **Track Progress** – AI-driven insights help users stay on course.
  - "Get Started" button prompts a popup dialogue with two buttons (with descriptions): sign in with google, view guide

###  c.  **Short video series** - 
- arousel of autoplaying short videos where each one is about a different topic on self-development and progress progression. mobile aspect ration Use placeholders for now

### **d. About Section (Further Down the Homepage)**
- This section tells the **story behind the platform**:
  - Who the developers are.
  - Why the platform was created.
  - The broader **vision and aspirations** for Life Blueprint.

### **d. A contact form **
- A user can submit a form that gets emailed to me automatically where They just provide their email, the type of contact(feature, bug, partnership, other)


## **5. The Blueprint**
- Although it's not its own page, the blueprint is the backbone of this platform. It's the sections and subsections that the user will be interacting with, and those interactions which are stored in the database for each user will be used for all the internal functionality. Being at the blueprint needs to be used in different pages across the platform, it needs to be called upon to give responses that were given to it, and it needs to be able to be edited and changed by the Administrator, I want this thing to be built up properly.
---

# **3. Tech Stack & Dependencies**

- **Next.js:** For server-rendered React pages.
- **Tailwind CSS:** For consistent UI styling.
- **ShadCN:** For prebuilt React component patterns.
- **Supabase:**
  - Postgres with real-time capabilities.
  - OAuth-based authentication (Google).
  - Row-Level Security for fine-grained access control.


### Database Setup Already In Place

You’ve established the following schema in Supabase:
- **`admin_users`**
  - Stores information about authorized admins.
  - Columns: `id`, `email`, `created_at`
- **`guide_sections`**
  - Defines major sections of the guide (Blueprint).
  - Columns: `id`, `title`, `description`, `order_position`, `created_at`, `updated_at`, plus references to the admin.
  - Realtime enabled.
  - Triggers automatically update `updated_at` and Functions available for reordering sections.
- **`guide_subsections`**
  - Groups more detailed prompts underneath each section.
  - Columns: `id`, `section_id`, `title`, `description`, `malleability_level` (enum of `green`, `yellow`, `red`), `order_position`, `created_at`, `updated_at`, plus references to the admin.
  - Realtime enabled.
  - Triggers automatically update `updated_at` and Functions available for reordering subsections, including `notify_subsection_reorder`.
- **`user_responses`**
  - Stores a user’s written content or answers to each subsection.
  - Columns: `id`, `user_id`, `subsection_id`, `content`, `created_at`, `updated_at`.
  - Row-Level Security (RLS) ensures only the owner can see or modify their responses.
- **`user_progress`**
  - Tracks completion status and flags for each user on a per-subsection basis.
  - Columns: `id`, `user_id`, `subsection_id`, `completed`, `flagged`, `created_at`, `updated_at`.
  - RLS ensures only the owner can read or update their progress.
- **Indexes:**
  - On `order_position` for faster reordering queries.
  - On `user_id` for quick user-specific lookups.
- **Triggers:**
  - Auto-update `updated_at` in all tables.
  - `notify_subsection_reorder` to broadcast reorder events.
- **Functions:**
  - `update_updated_at_column` to handle timestamps.
  - `reorder_sections` and `reorder_subsections` to reorder items with server-side validations.


---

# **4. Advised File Structure**
A clean, modular structure to keep the project scalable.

lifeguide
├── app
│   ├── (site)
│   │   └── page.tsx               // Landing Page
│   ├── (dashboard)
│   │   ├── layout.tsx             // Dashboard Layout (Protected)
│   │   ├── page.tsx               // User Dashboard
│   │   ├── admin
│   │   │   └── page.tsx           // Admin Dashboard
│   │   └── blueprint
│   │       └── page.tsx           // Optional: Detailed blueprint or user editor
│   ├── (public-blueprint)
│   │   └── page.tsx               // Public read-only blueprint
│   ├── api
│   ├── layout.tsx                 // Global layout
│   └── globals.css                // Tailwind CSS
├── components
│   ├── ui                         // ShadCN components
│   ├── Blueprint.tsx              // Single blueprint component
│   ├── DashboardCard.tsx          // Customizable user dashboard cards
│   └── ...
├── lib
│   ├── supabaseClient.ts
│   └── auth.ts
├── types
│   └── blueprint.ts               // TypeScript definitions
├── utils
│   └── helpers.ts
├── supabase
│   └── schema.sql                 // schemas, triggers, etc.
├── .env.local
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json

---




# Build instructions
	•	Plan for distinct content sections: hero banner, explainer text, CTA, etc.


1.2 Hero Section (Landing) (1.2.1)
	1.	Explainer Video (optionally skip button)
	•	Use an HTML5 <video> or an embedded service (YouTube/Vimeo).
	•	Place it near the top with a clear CTA.
	2.	Quick Links / Arrows (1.2.2)
	•	Tailwind-based arrow icons or a “scroll down” button.
	•	Possibly anchor links to “About” or “Features” sections within the page.

1.3 About Section (1.3.1)
	1.	Story & Vision
	•	Summary who you are, why you built LifeGuide, etc. 
	•	Could be collapsible or an accordion if you want less clutter.
	2.	Optional Contact Form (1.3.2)
	•	A simple form: name, email, message.
	•	For now, store it or email it to yourself using a service (e.g., Formspree or building a minimal Next.js API route).


2. Admin Page (Blueprint Management + Traffic)

Now you’ll build the Admin interface to create and manage blueprint sections/subsections, plus basic user/traffic analytics.


2.1 Blueprint Builder and Editor
- here you can edit the Blueprint itself, as well as the "How-To" aside section that goes along with it. 
- This "how-to" section well always be presented with the guide (how it will be presented UI wise varies from page and usecase of the guide


2.1.1 DB Schema (Sections & Subsections)
	•	guide_sections and guide_subsections contain all the info about the blueprint components. 
  * guide_section:
  - Title 
  - description
  * guide_subsection:
  - section id
  - title 
  - desription
  - subdescription
  - malleability-level (green, yellow, red)
  - malleablity description
  - example
  - order position

2.1.3 How-To editor (white opaque Container with rounded edges)
- describes how the guide is to be used.
- when being edited, should be inside a markdown text editor input box that shows the entire how to in an editable markdown form (until hitting 'done')
- that too needs to be able to be edited.


2.1.4 Blueprint editor (white opaque Container with rounded edges)
- Blueprint 
	1. Blueprint Overview: Display the existing sections and their descriptions as a parent container, and inside  the subsections with just their title in a a drag-and-drop arrangement.
  2.  if i click on a subsection it expands to show me the all the details of the subsection (guide_subsection). If i click again or on a different subsection, it collapses.
  3. next to the tiotle of each section and subsection is an editor icon, that when pressed, expands the card (if not expanded) and allwos each field to be edited. then a checkmark icon should be pressed to commit changes
  4. each subsections has the following parameters that can be edited:
  section:
  - Title 
  - description
  subsection:
  - section its under (hidden)
  - title 
  - desription
  - subdescription
  - malleability-level (green, yellow, red)
  - malleablity description
  - example
  ** order position of subsections should be edited in a drag and drop format within the subsection

2.1.5 Section & Subsection Cards
	•	Each section might appear as a “card” with title/description.
  - Provide "add Section" and "add Subsection" buttons under the how to 
	•	Provide “Edit” and “Delete” icons (ShadCN’s Button + Dialog can be a neat approach).

2.2 Traffic Monitoring & Sign-Ups

2.2.1 Basic Analytics Approach
	•	If you’re using Supabase’s built-in analytics or a third-party, consider how you’ll surface that data.
	•	For simpler tracking, you might store visit_count or record certain events in a separate table.

2.2.2 Admin Dashboard UI
	•	Include quick stats:
	•	“Total Page Views”, “Unique Sign-Ups”, “Blueprint Completion Rate” (though you might not have user sign-ups yet, you can at least mock these or store them for future).
	•	This can be displayed with small cards or a table in the Admin page.

Deployment Note: Now you have an Admin system to define the blueprint before you let users sign up and fill it out. You can deploy this second iteration.

3. Public Viewable Blueprint

This is your marketing/inspiration page for guests to see a sample blueprint.

3.1 Database Prep (3.1.1)
	•	You can either:
	1.	Create a “Demo” user with a completed blueprint in blueprint_sections, blueprint_subsections, and “fake” user_responses.
	2.	Or define a table public_blueprints to store example data separately.

3.2 Public Blueprint Page (3.2.1)
	•	app/(public-blueprint)/page.tsx:
	1.	Fetch either the “demo” user’s blueprint or from public_blueprints.
	2.	Render sections/subsections in read-only mode.
	3.	CTA for “Sign up to create your own!” (Though sign-up flow is not yet implemented, you can at least link to a placeholder).

3.3 Layout & UI (3.3.1)
	•	Possibly a different layout from the main site if you want a minimal top-bar or different look.
	•	Let visitors browse without an account. Keep it simple with subsections collapsed or displayed with Accordion.

Deployment Note: Now you can show potential users what a completed blueprint might look like—driving signups once the sign-in flow is introduced.

4. User Sign-In (OAuth) + User Dashboard (Blueprint Editor/Viewer)

Finally, the critical user-facing functionality: letting people create accounts, fill out their blueprint, and see a personal dashboard.

	Tip: If you want to restrict the Admin page behind sign-in from the start, you could have implemented OAuth earlier, but since your stated priority was to build the Admin page second, we can retroactively lock it down now.

4.1 OAuth (4.1.1)
	1.	Set up Supabase Auth
	•	Enable Google OAuth in your Supabase project.
	•	Copy your client ID/secret into .env.local.
	2.	Add “Sign In” Button
	•	On your homepage or a dedicated /(site)/login page, place a sign-in button.
	•	Use the Supabase client: supabase.auth.signInWithOAuth({ provider: 'google' }).
	3.	Redirect / Session Handling
	•	Once signed in, store user in Supabase auth.users.
	•	Use a server-side check or client context to see if session is active.

4.2 User Dashboard (4.2.1)
	1.	Dashboard Layout (app/(dashboard)/layout.tsx)
	•	Only accessible if user is logged in. Otherwise, redirect to sign-in.
	•	A side nav or top nav with links to “My Blueprint,” “Settings,” etc.
	2.	Blueprint Editor/Viewer
	•	Persistent Panel: on the right side, show the user’s current blueprint (fetched from blueprint_sections + user_responses).
	•	Edit Mode: Expand to full screen or a modal.
	•	When user updates a subsection, store in user_responses table.
	•	Show “Done” or “Save” button that closes the modal.
	3.	Completion Flow (4.2.2)
	•	You mentioned restricting the user from skipping ahead. You can do this by checking if the user has responded to each subsection in the correct order.
	•	After all subsections are filled, show a “Blueprint Complete!” message. That might unlock additional dashboard features.

4.3 Customizable Cards (4.3.1)
	1.	Add/Remove: Provide an “Add Card” button. Let the user choose which blueprint subsection’s response they want to highlight.
	2.	Visual Appearance: Possibly use ShadCN’s Card or Popover to display user’s data.
	3.	Drag & Drop (Future Enhancement): For now, keep it simple (just store the order in a local state or user-specific DB record later if you want to persist changes).

4.4 Settings Panel (4.4.1)
	1.	Notification Settings: Let user opt in to daily/weekly/monthly.
	2.	Sign Out: Easy supabase.auth.signOut() button.
	3.	(Optional) Profile: If you want them to set a display name or handle, store it in a profiles table.

Deployment Note: With the user sign-in and dashboard deployed, your platform is functionally ready to accept real users who can build and edit their Life Blueprints.

Potential Additional Steps
	•	Notifications: Use a scheduled job or cron to send AI-curated emails (integrate with an LLM if desired).
	•	AI Buddy: Offer a chat-like interface that references the user’s blueprint.
	•	Analytics & Traffic: If you want advanced analytics, integrate something like Google Analytics or Supabase analytics to show real-time usage.


Summary of the 4-Part Deployment Plan
	1.	Homepage
	•	1.1 Landing/Hero/Video
	•	1.2 Navbar & Footer
	•	1.3 About & Contact
	2.	Admin Page
	•	2.1 Blueprint Builder
	•	2.1.1 DB schema for sections/subsections
	•	2.1.2 Admin UI (cards for each section/subsection)
	•	2.1.3 Create/Edit/Delete
	•	2.2 Traffic & Sign-Up Analytics (stub if sign-up isn’t ready)
	3.	Public Blueprint
	•	3.1 Demo user or public_blueprints table
	•	3.2 Rendering read-only blueprint pages
	•	3.3 CTA to sign up
	4.	User Sign-In & Dashboard
	•	4.1 OAuth Setup
	•	4.1.1 Google provider in Supabase
	•	4.2 Dashboard Layout
	•	4.2.1 Persistent blueprint panel
	•	4.2.2 Completion flow & data save
	•	4.3 Customizable Cards
	•	4.3.1 Basic add/remove
	•	4.4 Settings Panel
	•	4.4.1 Notification preferences, sign-out

