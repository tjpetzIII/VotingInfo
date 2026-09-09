# Research

`frontend/package.json` declares `zod` as `^4`. The lockfile resolves `zod` 4.4.3 and the resolver package accepts Zod `^3.25.0 || ^4.0.0`. The login form imports Zod through the existing `zodResolver`; no compatibility workaround or production change is indicated.
