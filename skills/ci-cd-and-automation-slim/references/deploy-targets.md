# Deploy Target Reference

Platform notes for the deploy principles in `SKILL.md` §5. Each section covers how to trigger a deploy, how to verify it, and the known traps.

---

## Render (Web Services, Docker)

- **Trigger:** A deploy hook URL (`curl -fsS -X POST "$HOOK"`) or the REST API (`POST /v1/services/{id}/deploys`). Store the service ID as an environment variable or secret, and don't look it up by name on every run.
- **Verify:** The trigger returns before the deploy finishes. Poll `GET /v1/services/{id}/deploys/{deployId}` until `live` (success) or `build_failed` / `update_failed` / `canceled` (failure), with a bounded loop (for example 15 s × 60) and a distinct timeout exit code. Then smoke-test the service's health path.
- **Port binding:** Render sets `PORT` (default `10000`) and scans for an open port on `0.0.0.0`. Pick **one** convention and apply it in every place that sets it: app code (`ASPNETCORE_URLS` or an explicit `UseUrls`), the Dockerfile, `render.yaml`, and the dashboard env vars. Settings disagreeing between those places is the usual cause. `EXPOSE` is documentation, not binding. Before you change any binding setting, diff all of these against the last deploy that went live.
- **Startup:** A service that binds late (slow hosted services, blocking DI construction, or migrations at boot) fails the port scan. Keep startup work off the critical path and run migrations from CI before the deploy.
- **Blueprints:** Keep `render.yaml` as the source of truth for service config, and in sync with dashboard settings. Drift between the two is a common cause of "works on one tier only".

## Cloudflare Pages

- **Deploy:** `cloudflare/wrangler-action@v3` or `npx wrangler pages deploy <dir> --project-name=<p> --branch="$BRANCH"`, using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the environment.
- **Branch → environment:** `--branch` set to the production branch deploys to production. Any other value creates a preview alias (`<branch>.<project>.pages.dev`; the name is lowercased and slugified, and long names are truncated). Use a stable preview name per PR (`pr-<number>`) so the URL is predictable.
- **Output:** Parse the deployment URL from wrangler's output (or the action's `deployment-url` output), set it as `environment.url`, and post it in a sticky PR comment.
- **Build config:** Build-time env vars (`VITE_*`, Angular `--configuration`) end up in the bundle and are public. Never put secrets in them.

## Postgres Providers (Supabase, Neon) & Migrations

- **One database per tier, named explicitly.** The migration step reads the same connection secret the service uses in that environment. Never use cross-provider or cross-tier fallbacks.
- **Portable migrations:** Provider-specific objects (Supabase's `anon` and `authenticated` roles, RLS helpers, extensions) must be guarded (`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN ... END IF; END $$;`) if the same migrations run on plain Postgres or Neon.
- **Connection strings:** Normalize URL-form strings to the driver's format in a script, `::add-mask::` the result, and use pooled vs. direct endpoints deliberately (migrations usually need the direct or session endpoint).
- **EF Core:** Build a migration bundle (`dotnet ef migrations bundle`) in CI and run it with `--connection`. Pin `dotnet-ef` to the same major as the runtime.
- **Supabase CLI:** Pin the CLI version (not `latest`), run `supabase link --project-ref` with an environment-scoped ref, then `supabase db push`.
- **Free-tier pausing:** Free projects pause when idle. A scheduled keep-alive ping works, but GitHub disables scheduled workflows after 60 days without repository activity on public repos.

## GitHub Pages

- Use the official chain: `actions/configure-pages` → `actions/upload-pages-artifact` → `actions/deploy-pages`, with `pages: write`, `id-token: write`, `environment: github-pages`, and a `pages` concurrency group with `cancel-in-progress: false`.
- Upload only the built site directory, not `.` (the repo root), so source files and docs aren't published.

## GitHub Releases & Packages

- **Releases:** Trigger on `push: tags: ['v*']` and grant `contents: write`. Attach checksummed archives with `fail_on_unmatched_files: true`. Package binaries together with the runtime assets they load, so a download actually runs.
- **npm on GitHub Packages:** `setup-node` with `registry-url: https://npm.pkg.github.com` and `scope`, then `npm publish` with `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` and `packages: write`. Consumers need a token with `read:packages`, even for public packages.
- **Tag-triggered chains:** A tag created by `GITHUB_TOKEN` (for example by an auto-version action) won't trigger the tag workflow. Use an App token, or call the release job from the same workflow.

## Containers (Generic)

- Pin base images by digest for releases, build with `--pull` on a schedule to pick up security patches, and run as non-root.
- The runtime version in `FROM` must match CI's toolchain (`node-version-file`, `global.json`). When a framework major requires a newer runtime, update both in the same PR.
