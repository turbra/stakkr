---
title: GitHub Pages Deployment
description: How the Docusaurus site is built and published.
---

# GitHub Pages Deployment

The Docusaurus site lives in `website/` and is configured as a GitHub Pages
project site:

| Setting | Value |
| --- | --- |
| URL | `https://turbra.github.io` |
| Base URL | `/stakkr/` |
| Output directory | `website/build` |
| Pages source | GitHub Actions |

The workflow in `.github/workflows/pages.yml` builds the site on pushes to
`main`, uploads `website/build`, and deploys the uploaded artifact with GitHub
Pages.

## Local Build

Install dependencies and build the production site:

```bash
cd website
npm ci
npm run build
```

Serve the production build locally:

```bash
cd website
npm run serve
```

## Base URL Check

After `npm run build`, check for root-relative internal links that would break
under `/stakkr/`:

```bash
rg --pcre2 -n 'href="/(?!stakkr)|src="/(?!stakkr)' website/build/**/*.html website/build/index.html
```

No matches should appear for internal docs routes or static assets. External
absolute URLs are fine.
