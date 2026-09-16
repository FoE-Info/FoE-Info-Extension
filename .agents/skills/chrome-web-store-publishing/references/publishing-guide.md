# Chrome Web Store Publishing Guide

Manage `CHROMEWEBSTORE.md` — the single source of truth for all Chrome Web Store listing
metadata, permissions justifications, privacy disclosures, version history, and publishing
readiness for a Chrome extension project.

### Core Workflow

Every time you touch a Chrome extension project in a way that affects its store presence,
update (or create) `CHROMEWEBSTORE.md` in the project root. The file tracks everything the
developer needs to fill out in the Chrome Developer Dashboard, so they can copy-paste from
a single doc instead of scrambling at publish time.

#### When to create CHROMEWEBSTORE.md

Create it the moment any of these happen:

- The user says they want to publish an extension
- The user asks to "prepare for the store" or "get ready to publish"
- You're building a new extension that will clearly end up on the store
- The user asks about store listing requirements

Use the template in `references/webstore/chromewebstore-template.md` as your starting point. Read it
before generating the file.

#### When to update CHROMEWEBSTORE.md

Update it whenever:

- **User-facing changes**: Bump the "Last Updated" date, update the feature list in
  descriptions, and add an entry to Version History
- **manifest.json changes**: If permissions, host_permissions, or content_scripts changed,
  update the Permissions Justification section — every permission needs a plain-English
  reason the review team can understand
- **New release**: Add a Version History entry with version number, date, and summary
- **Privacy-relevant changes**: If data collection, storage, or transmission changed,
  update the Privacy & Data Use section and the privacy policy
- **Asset changes**: If icons or UI changed, note which screenshots need refreshing
- **Rejection response**: If the user reports a CWS rejection, update the file with the
  fix and add a note to Version History

#### How to fill it out

For each section, pull information from the actual project files:

1. Read `manifest.json` to extract name, version, description, permissions, host_permissions
2. Scan the codebase for data collection (storage, fetch calls, analytics)
3. Check for icon files and their dimensions
4. Look at the extension's UI to understand features for the description

Write store-facing copy in a tone that is specific, honest, and benefit-oriented. The Chrome
Web Store review team rejects vague descriptions. "Makes your life easier" will be rejected.
"Highlights search results on any webpage and lets you save highlights to a local list" will
pass.

**Never mention implementation details.** Users care what the extension does for them, not
how it was built. Strip any mention of APIs, libraries, frameworks, or code patterns:

| ❌ Implementation detail (cut it)                       | ✅ User benefit (keep it)                                     |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| "Uses a MutationObserver to detect page changes"        | "Automatically detects new content as you browse"             |
| "Built with custom elements and Shadow DOM"             | "Works seamlessly without affecting page styles"              |
| "Powered by a service worker for background processing" | "Runs quietly in the background without slowing your browser" |
| "Leverages the chrome.storage.sync API"                 | "Your settings sync across all your devices"                  |
| "Implements declarativeNetRequest for filtering"        | "Blocks ads and trackers without reading your page content"   |

### CHROMEWEBSTORE.md Sections

Read `references/webstore/chromewebstore-template.md` before generating the file — it defines
what each section covers and how to fill it out. The highest-risk section is Permissions
Justification: write a specific plain-English reason per permission and per host_permission.
"Needed for the extension to work" will be rejected. Read `references/webstore/privacy-policy.md`
for guidance on generating a privacy policy.

### Pre-Publish Checklist

Before submission, run through `references/webstore/review-checklist.md`. The most common
first-submission failures:

- Every permission and host_permission must have a specific justification (not "needed to work")
- Privacy policy URL must be live and match the data use disclosure form
- At least 1 screenshot at 1280×800 or 640×400
- ZIP must exclude `.git/`, `node_modules/`, `.env`, `CHROMEWEBSTORE.md`

### Store Listing Copy Guidelines

For copy guidelines and common rejection reasons, see `references/webstore/store-listing.md`.
Key rule: lead with function ("Highlights search terms on any webpage"), not feeling ("Enjoy
searching again").

### WebStore Review: User-Initiated Permissions Justifications

When submitting permissions that modify user data or system state (such as `clipboardWrite`, `storage`, or `tabs`):

- **User-Gesture Requirement**: Explicitly state in the justification that the action occurs exclusively in direct response to an explicit user interaction (e.g., clicking a "Copy" button).
- **Exact Destination & Purpose**: Explain what data is written and where the user pastes it.
- **Example (`clipboardWrite`)**:
  > _"The `clipboardWrite` permission is used exclusively when the user clicks an explicit 'Copy' button in the extension panel (such as copying Great Building investment spots, Guild Battleground focus targets, or inventory tallies). It copies formatted text to the user's system clipboard so they can paste it directly into in-game chat threads or external spreadsheets. It never writes to the clipboard automatically or without user intent."_

---
