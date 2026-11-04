# AGENTS.md

This file provides guidance to agents (like OpenCode) working with this repository.

## Project Overview

This is a Next.js 16 static site for forcelabs.de, built with:
- Next.js 16 (App Router)
- React 19
- TypeScript
- pnpm as package manager
- ESLint with Next.js config

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

## Required Workflow After Any Code Changes

**Always run these two commands after making any changes:**

1. `pnpm lint` - Ensures code quality and catches issues early
2. `pnpm build` - Verifies the production build succeeds

Both must pass before considering changes complete.

## Project Structure

```
app/              # Next.js App Router pages
  page.tsx        # Home page
  kontakt/        # Contact page (replaces old impressum)
  layout.tsx      # Root layout with header/footer
components/       # React components
hooks/            # Custom React hooks
.opencode/skills/ # Project-specific skills
  dependency-security-check/  # Dependency audit skill
public/           # Static assets
styles/           # CSS styles
```

## Key Files

- `package.json` - Dependencies and scripts
- `pnpm-workspace.yaml` - pnpm config with `minimumReleaseAge: 10080` (7 days)
- `next.config.js` - Next.js config with `/impressum` → `/kontakt` redirect
- `eslint.config.mjs` - ESLint config extending `eslint-config-next`

## Dependency Policy

- Uses `pnpm` with `minimumReleaseAge: 7 days` for supply-chain safety
- Never bypass with `minimumReleaseAgeExclude` except for **critical** vulnerabilities that affect the project
- Run `pnpm check:deps` to audit dependencies and check update eligibility
- Run `pnpm audit` for standard npm audit

## Code Style

- TypeScript strict mode enabled
- ESLint with Next.js core-web-vitals config
- React 19 with modern patterns
- Static export (pages are pre-rendered)

## Security Notes

- Contact email is obfuscated in HTML, revealed client-side via `useIsClient()` hook
- No external services, analytics, or tracking
- All pages statically generated
- CSP nonce handled by Next.js automatically

## Testing Changes

After any modification:
```bash
pnpm lint && pnpm build
```

Both must pass. If they fail, fix the issues before proceeding.