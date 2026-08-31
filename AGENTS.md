<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SARPRAS POKADA - Agent Rules

## Project
Aplikasi peminjaman sarana prasarana kampus. Next.js 16.3.3, React 19, TypeScript, Tailwind v4.

## Commands
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - ESLint check
- `npx tsc --noEmit` - Type check

## File References
- `MEMORY.md` - Catatan percakapan & progress project
- `SKILLS.md` - Panduan skill: frontend-design, next.js, ai.sdk, shadcn.ui
- `DESIGN.md` - Arsitektur, tech stack, data models, folder structure
- `PROMPT.md` - Prompt template & batasan konteks project

## Rules
1. Baca MEMORY.md sebelum mulai untuk tahu progress terakhir
2. Update MEMORY.md setelah selesai session dengan catatan apa yang dikerjakan
3. Ikuti DESIGN.md - HANYA buat UI berdasarkan screenshot Figma dari user, JANGAN buat desain/layout sendiri (no AI slop)
4. Ikuti PROMPT.md untuk batasan konteks - JANGAN keluar dari scope sarpras kampus
5. Ikuti SKILLS.md untuk konvensi styling dan framework
6. Bahasa UI: Indonesia. Kode: Inggris.
7. Server Component default. "use client" hanya jika ada interaktivitas.
8. Validasi semua form input dengan zod.
9. Jalankan `npm run lint` dan `npx tsc --noEmit` sebelum selesai.
10. Jangan commit kecuali diminta.
