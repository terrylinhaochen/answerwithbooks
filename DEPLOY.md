# Deploying answerwithbooks.com

The site is a fully static Astro build, deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`.

## One-time GitHub setup

Already done via the GitHub API: the repo exists at
`terrylinhaochen/answerwithbooks` with all site files committed, and Pages is enabled
with the workflow build source.

**One remaining manual step — push the deploy workflow.** The gh token used for the
initial push lacked the `workflow` OAuth scope, so `.github/workflows/deploy.yml`
exists locally but is not yet on GitHub. To finish:

```bash
# grant the workflow scope (opens browser once)
gh auth refresh -h github.com -s workflow

# from the project root, link the local copy and push the workflow
# (see "Linking a local checkout" below if .git doesn't exist yet)
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deploy workflow"
git push origin main
```

The push triggers the first deploy automatically.

For reference, the original from-scratch setup commands:

```bash
# 1. Create the public repo and push
gh repo create terrylinhaochen/answerwithbooks --public --source . --push

# 2. Enable GitHub Pages with the Actions (workflow) build source
gh api repos/terrylinhaochen/answerwithbooks/pages -X POST -f build_type=workflow

# 3. (After DNS is set up) tell GitHub Pages about the custom domain.
#    public/CNAME already contains "answerwithbooks.com", which GitHub reads
#    from the deployed artifact, but setting it via the API also enables
#    domain verification + HTTPS provisioning:
gh api repos/terrylinhaochen/answerwithbooks/pages -X PUT -f cname=answerwithbooks.com

# 4. Enforce HTTPS once the certificate is issued (can take a few minutes after DNS resolves):
gh api repos/terrylinhaochen/answerwithbooks/pages -X PUT -F https_enforced=true
```

If `gh` isn't authenticated: `gh auth login` first.

## Linking a local checkout

The initial commits were pushed via the GitHub API, so if your local working copy has no
`.git` directory yet, link it like this (from the project root):

```bash
git init -b main
git remote add origin https://github.com/terrylinhaochen/answerwithbooks.git
git fetch origin
git reset origin/main          # marks local files as the committed state
git branch --set-upstream-to=origin/main main
git status                     # should show a clean (or nearly clean) tree
```

From then on, normal `git add / commit / push` workflows apply, and every push to `main`
triggers a deploy.

## DNS (GoDaddy) for answerwithbooks.com

Because `public/CNAME` is present, GitHub serves this project repo at the custom domain —
**not** at `terrylinhaochen.github.io/answerwithbooks/`. Astro is configured with
`site: https://answerwithbooks.com` and `base: "/"` accordingly.

In GoDaddy → DNS for `answerwithbooks.com`, create:

| Type  | Name | Value                       | TTL     |
|-------|------|-----------------------------|---------|
| A     | @    | 185.199.108.153             | default |
| A     | @    | 185.199.109.153             | default |
| A     | @    | 185.199.110.153             | default |
| A     | @    | 185.199.111.153             | default |
| CNAME | www  | terrylinhaochen.github.io   | default |

Notes:

- Delete any pre-existing GoDaddy "parked" A record on `@` (often `Parked` or a GoDaddy IP).
- The four A records are GitHub Pages' anycast IPs for apex domains.
- `www.answerwithbooks.com` will redirect to the apex once the CNAME and GitHub's custom
  domain setting are in place.
- Propagation: usually minutes, occasionally up to 24-48h. Check with
  `dig answerwithbooks.com +noall +answer`.
- After DNS resolves, in the repo: Settings → Pages → confirm custom domain shows
  `answerwithbooks.com` and tick **Enforce HTTPS** (or use the API commands above).

## Environment variables

The build embeds the Supabase URL and anon key into the client bundle:

- Local: `.env` (gitignored) — see `.env.example`.
- CI: set inline in `.github/workflows/deploy.yml`. The anon key is public by design;
  data protection comes from Supabase Row Level Security, not key secrecy.

## Supabase auth settings

- Email/password auth must be enabled (Authentication → Providers → Email).
- If "Confirm email" is ON, new signups receive a confirmation link before they can log in;
  the signup page handles both modes.
- Recommended: set Authentication → URL Configuration → Site URL to
  `https://answerwithbooks.com` so confirmation links redirect to production.

## Manual deploy / verification

```bash
npm run build        # outputs dist/
npx astro preview    # serve the production build locally
```

The workflow can also be triggered manually: Actions → "Deploy to GitHub Pages" → Run workflow.
