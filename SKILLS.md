# SKILLS - Frontend Development

## Skill: frontend-design
- Gunakan Tailwind CSS v4 untuk styling
- Mobile-first responsive: base -> sm -> md -> lg -> xl
- Warna primer: blue-600, sekunder: gray, aksen: green/orange
- Spacing konsisten: 4, 6, 8 unit
- Border radius: rounded-lg (kecil), rounded-xl/2xl (card)
- Shadow: shadow-sm default, shadow-md hover, shadow-lg/2xl hero
- Transisi: transition-colors untuk hover state
- Tipografi: text-sm (body kecil), text-base (body), text-lg-4xl (heading)
- Dark mode: via CSS variables (`--background`, `--foreground`)
- Komponen card: bg-white rounded-xl p-6 shadow-sm hover:shadow-md
- Grid layout: grid sm:grid-cols-2 lg:grid-cols-3 gap-6

## Skill: next.js
- Versi: 16.3.3 (BUKAN versi lama, cek docs di node_modules/next/dist/docs/)
- App Router, bukan Pages Router
- Server Components default, tambah "use client" hanya jika perlu
- File conventions: page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx
- API routes: app/api/[...]/route.ts dengan export GET/POST/PUT/DELETE
- Image: next/image dengan width/height eksplisit
- Font: next/font/google (Geist, Geist_Mono)
- Metadata: export const metadata di server component
- Dynamic routes: [param], catch-all: [...param]
- Route groups: (group) untuk layout tanpa URL
- Middleware: middleware.ts di root untuk auth guard
- Layout props: `LayoutProps<"/path">` (Next.js 16 convention)

## Skill: ai.sdk
- Vercel AI SDK untuk integrasi AI (belum diinstall)
- Package: `ai` dan provider packages
- Streaming responses untuk chat UI
- useChat hook untuk client-side chat
- generateText/streamText untuk server-side
- Tool calling support
- Gunakan hanya jika fitur AI diperlukan di project

## Skill: shadcn.ui
- BELUM DIINSTALL - perlu setup terlebih dahulu
- Setup: `npx shadcn@latest init`
- Tambah komponen: `npx shadcn@latest add [component]`
- Komponen prioritas untuk project ini:
  - button, input, label, card (dasar)
  - dialog, sheet, dropdown-menu (navigasi)
  - table, badge, tabs (data display)
  - form, select, calendar, date-picker (form peminjaman)
  - toast, alert (notifikasi)
  - avatar, separator (layout)
- Lokasi: components/ui/
- Styling: menggunakan CSS variables dan Tailwind
- Integrasi dengan react-hook-form + zod untuk validasi form
