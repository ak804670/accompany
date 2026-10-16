# Accompany — Web Client & Marketing Website

Modern, responsive web platform and companion journal for **Accompany** (emotional support, anonymous listening, and companionship). Built with React 19, TypeScript, Tailwind CSS, and shadcn/ui.

## Pages & Structure

- **Landing Page (`/`)**:
  - Live online companion counters and real-time audio call simulation preview
  - Emotional needs quick picker (Breakups, Loneliness, Late Night, Dating Fatigue, Men's Health)
  - Vetted companion showcase cards with ratings, rates, and direct call triggers
  - How It Works (3-step flow)
  - Real user transformation stories & testimonials
  - Latest featured journal articles
  - Interactive FAQ accordion
  - High-conversion Google Play download sections & QR code scan
- **The Accompany Journal / Blog List (`/blogs`)**:
  - Live instant search across titles, excerpts, authors, and tags
  - Category filters (Heartbreak & Healing, Emotional Wellness, Dating & Relationships, Companionship)
  - Featured editor's pick hero card
  - Responsive cards grid powered by `src/data/blogs.json`
- **Blog Detail Page (`/blogs/:slug`)**:
  - Reading progress bar indicator
  - Newsreader editorial serif typography and structured sections
  - Key Takeaways callout box
  - Social sharing (WhatsApp, X / Twitter, Copy Link with feedback)
  - Contextual companion callout
  - Related stories section (dynamically linked via `relatedSlugs`)
- **Contact Page (`/contact`)**:
  - Interactive inquiry form (Support, Account & Coins, Privacy, Partnerships)
  - Instant form feedback state
  - "Become an Accompany Companion" recruitment application section
  - 24/7 SLA and Grievance Officer details
- **Terms & Privacy Legal Page (`/terms`, `/terms-and-conditions`, `/privacy-policy`)**:
  - Interactive tab switcher between **User Terms & Conditions** and **Privacy Policy**
  - Adapted legal framework: 100% user anonymity, intermediary status under IT Act 2000, peer listener experience-sharing scope, zero-tolerance platform-only communication rule, assumption of risk / self-harm release, non-refundable coin wallets, and 18+ age mandate
  - Linked directly in footer for clean compliance
- **Global Elements**:
  - Sticky responsive Navbar with dark/light mode toggle
  - High-conversion Footer with Google Play badge and QR code
  - Interactive `AppDownloadModal` modal triggered anywhere across the site

## Tech Stack & Design System

- **Framework:** React 19 + Vite 8
- **Language:** TypeScript in strict mode
- **Styling:** Tailwind CSS v4 + Accompany App Theme Tokens
  - Palette: Warm linen (`#F7F4EF`), surface (`#FFFCF8`), signature rose (`#C7377A`), text (`#1C1916`)
  - Typography: `Newsreader` (editorial serif display) & `Inter` (sans)
- **Data:** `src/data/blogs.json` & `src/data/companions.json`
- **Routing:** React Router v7

## Getting Started

```bash
cd web
npm install
npm run dev
```

## Quality Checks & Production Build

```bash
npm run typecheck
npm run build
npm run preview
```
