---
name: Project Agent Guide
description: Always run lint/build and code review after changes. Never auto-commit without explicit approval.
---

# AGENTS.md

This file provides guidance to agents working with this repository.

## Do Not Auto-Commit

Never commit changes automatically. Always ask before committing. If not explicitly told to commit, leave changes uncommitted.

## Required Workflow After Any Code Changes

Always run these commands after making any changes:

1. `pnpm lint`
2. `pnpm build`

Both must pass before considering changes complete.

Also always run the code review agent (`@reviewer`) before committing changes.

## Development Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Run dependency security check
pnpm check:deps
```

## Project Overview

This is a Next.js 16 static site for forcelabs.de.
- App Router (`app/`)
- React 19, TypeScript strict mode
- pnpm with `minimumReleaseAge: 10080` (7 days)
- Static output (pages pre-rendered)

## Project Structure

```
app/              # Pages (page.tsx, kontakt/)
components/       # React components
hooks/            # Custom hooks
.opencode/        # Agent config and skills
public/           # Static assets
styles/           # CSS
```

## Key Rules

- Always ask before committing.
- Always run `pnpm lint && pnpm build` after changes.
- Always run `@reviewer` before committing.
- For critical dependency vulnerabilities that affect the project: fix immediately (bypass cutoff for that exact fix version only), record in commit message.
- Do not use `minimumReleaseAgeExclude` broadly.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
