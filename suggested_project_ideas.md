# Upgraded SaaS Blueprint: VouchRank & AIO Hub

> ⚠️ **Historical / superseded.** This is the original idea doc. Some details are now
> out of date — the build uses **Gemini 3.x** (not 1.5) and a **Supabase/Deno backend**
> (not Node.js), and the review funnel is **compliant (no gating)**. For current,
> accurate context see [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md),
> [COMPLIANCE.md](COMPLIANCE.md), and [ROADMAP.md](ROADMAP.md). Kept for history.

## 🏆 The Concept: Reputation Intelligence & AI-Search Optimization (AIO)
**VouchRank** is a next-generation white-label reputation platform. It goes beyond gathering traditional Google reviews by helping businesses capture high-converting **video testimonials** and optimizing their online presence for **AI search recommendations** (ChatGPT, Gemini, Perplexity).

---

## 💰 The Monetization Engine
- **Target Customers:** Digital Marketing & SEO Agencies, Local Service Chains (Dentists, Med Spas, Lawyers, Realtors).
- **The Value Pitch:** 
  - *"45% of high-value consumers now ask AI engines like ChatGPT/Gemini for business recommendations. If your online reviews are weak or lack specific keywords, AI will recommend your competitor instead. We help you collect the exact reviews and keywords that AI search models look for, while automating your social proof marketing."*
- **Pricing Model:** 
  - **White-Label Agency Plan:** $299/month (includes custom branding, custom domain support, and up to 15 business sub-accounts).
  - **Agency Pro Plan:** $499/month (includes unlimited sub-accounts, AI-search auditing, and video review storage).

---

## 🛠️ Upgraded Feature Set (The 2026 Edge)

### 1. 🤖 AI-Search (AIO) Audit Dashboard
- **The Feature:** Simulates local intent queries using LLMs (e.g., *"Who is the best plumber in Austin?"* or *"Recommend a highly-rated family dentist near downtown Chicago"*).
- **The Output:** A visual "AI Visibility Score" (0–100) showing how often the business is recommended, accompanied by an AI-generated optimization checklist (e.g., *"Gemini recommends your competitor because they have 14 reviews mentioning 'emergency repair'—you only have 2. Target this keyword in your next review request campaign."*).

### 2. 🎥 Universal Testimonial Collector (Text & Video)
- **The Feature:** A beautiful, responsive mobile-first funnel. When a customer scans a QR code or opens a link, they can type a review OR record a short 30-second video testimonial directly inside their mobile browser (no app install required).
- **Private Feedback Filter:** Auto-flags negative ratings (1-3 stars) and redirects them to a private customer-resolution form, keeping public ratings high.

### 3. 🎨 Review-to-Social Content Generator
- **The Feature:** Takes text reviews and automatically formats them into premium, ready-to-post social media graphics (LinkedIn, Instagram, X).
- **Design System:** Agencies can choose layouts, background gradients, custom fonts, and brand colors to generate high-fidelity PNGs in one click.

### 4. 🔗 Multi-Theme Social Proof Widgets
- **The Feature:** Sleek, lightweight, embedded HTML widgets (customizable sliders, grids, single quotes, and video players) built with vanilla CSS.
- **Micro-Animations:** Fade-ins, lazy loading, and interactive hover states that wow site visitors and increase conversion rates.

---

## 🗄️ Database & Multi-Tenant Architecture (Supabase / Postgres)

To support white-labeling, the schema is designed for multi-tenancy:
- **`agencies` Table:** Subdomain, agency logo, brand colors, custom CSS, stripe subscription.
- **`locations` Table:** The end-businesses managed by the agency. Connects to Google Business API credentials.
- **`reviews` Table:** Source (Google, Video, Manual), review content, sentiment score, targeted keywords, approval status.
- **`aio_audits` Table:** Keywords queried, AI recommendation status, visibility rating history.

---

## 🖥️ Implementation Stack & Visual Guidelines
- **Frontend Framework:** React (Vite) + Tailwind/Vanilla CSS.
- **Design Style:** Glassmorphic modern dark mode for the agency admin panel (glass cards, vibrant glowing borders, high-end typography like *Outfit* or *Inter*). Fully-customizable themes for the embedding widgets.
- **Media Uploads:** Directly stored in Supabase Storage or AWS S3 (for video reviews).
- **AI Backend:** Gemini 1.5 Flash/Pro via Node.js backend.

---

## 🚀 How We Can Begin
We will start by building the core design foundation and the interactive dashboards:
1. **Initialize the Vite React project** in this directory.
2. **Build the Custom CSS Design Tokens** (`index.css`) defining the brand palette (gradient animations, rich dark colors, custom font loading).
3. **Develop the Agency Admin Dashboard** (where they manage sub-accounts, see stats, and view collected reviews).
4. **Develop the Live Review Harvester Funnel** (the page end-customers see, including the video recorder simulator and review collector).
