<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules
- The imported Gato app lives in src/gato (marked // @ts-nocheck) and is mounted client-only from src/routes/index.tsx — it was written for a browser SPA and uses localStorage on load.
- Original Express endpoints (/api/*) are being ported to TanStack server functions + Lovable Cloud; see roadmap.md for status.
- Business data syncs per account via public.tenant_data (key/value jsonb) through src/gato/utils/cloudSync.ts; GatoRoot hydrates localStorage before mounting App — keeps the imported SPA's localStorage model working while persisting in Cloud.
