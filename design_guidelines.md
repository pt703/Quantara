# Quantara - Design Guidelines (Compacted)

## Core Architecture

### Authentication & Navigation
**Auth Flow:** Guest-first (explore without login), optional auth for sync/cloud storage
- Welcome → "Get Started" (guest) / "Log In" (SSO: Apple/Google)
- Guest users: all features, local-only persistence
- Settings: "Sign In to Sync" prompt for guests
- Account deletion: Settings > Account > Delete (double confirm)

**Navigation:** Bottom tabs (4) + Floating Action Button (FAB)
1. **Home** - Dashboard + recommendations
2. **Learn** - Modules/lessons
3. **Challenges** - Behavioral tasks
4. **Profile** - Financial data + settings

**FAB:** "Quick Learn" modal (daily 5-min lesson), 56pt circular, positioned 16pt above tab bar

**Stack Hierarchy:**
- Welcome (onboarding stack) → Main App (tab navigator) → Modals (quiz/challenge results)
- Each tab has nested stack for detail screens

---

## Screen Layouts

### Universal Header Rules
- **Transparent headers:** Welcome, Quiz
- **Default headers:** All other screens, non-transparent background
- **Top inset:** `headerHeight + Spacing.xl` (transparent) or `Spacing.xl` (default)
- **Bottom inset:** `tabBarHeight + Spacing.xl` (all tab screens)

### 1. Welcome Screen
- Full-screen branded: Logo "Quantara", tagline, hero illustration (480x320pt gradient shapes)
- Bottom CTA: Primary "Get Started", Secondary text "Log In"
- Safe area bottom: `insets.bottom + Spacing.xl`

### 2. Home/Dashboard
**Header:** Transparent, "Hi, [Name]" (left), notification bell (right)
**Content (ScrollView):**
- **Financial Snapshot Card:** 2x2 grid (Income, Debt, Subscriptions, Savings), tap → Profile
- **Continue Learning Card:** Title, progress bar, time remaining, "Resume" button
- **Recommendations:** Horizontal scroll, 280x160pt cards (tag chip, title, description, "Start" button)

### 3. Learn Overview
**Header:** "Learn" title, search icon (right)
**Content:** Vertical list of module cards (title, description, progress bar, chevron)

### 4. Module Detail
**Header:** Module name, back button
**Content:** Description + lesson list (completion icon, title, type/time, chevron)

### 5. Lesson Screen
**Header:** Lesson title, bookmark icon
**Content:** Rich text (headings, paragraphs, lists, tip boxes), bottom "Mark as Complete" button

### 6. Quiz Screen
**Header (Custom/Transparent):** Close button, progress "Question X of Y"
**Content:** Question card, 4 answer options (radio style), "Submit Answer" → "Next Question"
**Feedback:** Green/red border on answer, Quiz Results modal on completion (score, message, "Review"/"Continue")

### 7. Challenges Screen
**Header:** "Challenges" title, filter icon
**Content:** Segmented sections (Active, Suggested, Completed), cards with category icon, status badge, checkbox/chevron

### 8. Challenge Detail
**Header:** Challenge title, back button
**Content:** Description, step checklist (if multi-part), state-dependent button ("Start"/"Mark Complete"/"Completed")

### 9. Profile/Financial Snapshot
**Header:** "Profile" title, settings gear icon
**Content:**
- Avatar (80pt, 6 presets) + editable name
- Financial cards (tap to edit)
- **Subscriptions:** Name, logo, cost, toggle (Keep/Cancel)
- **Savings Calculator:** "Cancel [X] = save £[Y]/month"

### 10. Settings
**Header:** "Settings", back button
**Content:** Grouped lists (Notifications, Data & Privacy, Account, About), toggles, destructive actions (red text)

---

## Design System

### Colors
**Primary:** `#2563EB` (main), `#60A5FA` (light), `#1E40AF` (dark)
**Accents:** Success `#10B981`, Warning `#F59E0B`, Error `#EF4444`
**Neutrals:** Background `#F9FAFB`, Card `#FFFFFF`, Border `#E5E7EB`, Text Primary `#111827`, Secondary `#6B7280`, Disabled `#9CA3AF`
**Gradients:** Primary `#2563EB → #8B5CF6`, Success `#10B981 → #059669`

### Typography (System font: SF/Roboto)
| Style | Size | Weight | Use |
|-------|------|--------|-----|
| Large Title | 34pt | Bold | Welcome titles |
| Title | 28pt | Semibold | Card headings |
| Headline | 17pt | Semibold | Sections, buttons |
| Body | 17pt | Regular | Lesson content |
| Callout | 16pt | Regular | Card descriptions |
| Subhead | 15pt | Regular | Metadata |
| Footnote | 13pt | Regular | Hints |
| Caption | 12pt | Regular | Small labels |

### Spacing
`xs: 4pt`, `sm: 8pt`, `md: 12pt`, `lg: 16pt`, `xl: 24pt`, `2xl: 32pt`

### Components

**Cards:**
- White background, 12pt radius, shadow: `{width: 0, height: 1}, opacity: 0.05, radius: 4`
- Padding: `lg` (16pt), margin between: `md` (12pt)

**Buttons:**
- **Primary:** Primary bg, white text, 12pt radius, 50pt height, press opacity: 0.85
- **Secondary:** Transparent bg, 1pt primary border, 12pt radius, 50pt height, press bg: `#F3F4F6`
- **Text:** No bg/border, primary text, press opacity: 0.6

**Progress Bars:**
- 6pt height, 3pt radius, bg: `#E5E7EB`, fill: primary gradient, 0.3s animated

**FAB:**
- 56x56pt, primary gradient bg, white icon (Plus/Lightning), shadow: `{width: 0, height: 2}, opacity: 0.10, radius: 2`
- Press: scale 0.95

**Icons:** Feather set (@expo/vector-icons), 24x24pt default, match text color hierarchy

### Interactions
- Touch targets: 44x44pt min
- Press feedback: Opacity 0.7 or scale 0.98
- List items: `#F3F4F6` bg on press
- Active tabs: Color change + scale 1.05
- Form focus: Border → primary color

### Accessibility
- **Contrast:** WCAG AA (4.5:1 body text)
- **Labels:** All interactive elements have screen reader labels
- **Progress:** Include percentage text alternative
- **Errors:** Descriptive form error messages

---

## Assets to Generate

**User Avatars (6 presets):** Abstract geometric portraits, app colors, minimalist, 200x200pt @2x/@3x
**Welcome Hero:** Geometric shapes (ascending bars, circles, arrows), primary gradient + accents, 480x320pt @2x/@3x
**Challenge Category Icons:** Use Feather icons (no custom): Credit card (Spending), Document (Debt), Repeat (Subscriptions), Target (Saving)

**DO NOT generate:** Stock photos, realistic imagery, brand logos, complex illustrations