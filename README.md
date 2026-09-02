# 🏢 SARPRAS POKADA - Frontend

Sistem Manajemen Sarana dan Prasarana POKADA - Web Application Frontend

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Buka browser: `http://localhost:3000`

## 📋 Features

- ✅ **Landing Page** - Public homepage with information
- ✅ **Authentication** - Login & Register pages
- ✅ **Admin Dashboard** - Overview statistics and metrics
- ✅ **User Management** - CRUD users and roles
- ✅ **Borrowing Management** - Manage item borrowings
- ✅ **Return Management** - Handle item returns
- ✅ **Damage Reports** - Track and manage damage reports
- ✅ **Category Management** - Organize items by category
- ✅ **Search & Filter** - Search bar in navbar for all pages
- ✅ **Responsive Design** - Mobile, tablet, and desktop friendly

## 🎭 Mock Data Mode

Aplikasi ini menggunakan **mock data** untuk development dan demo.

- ✅ Tidak perlu backend atau database
- ✅ Data dummy sudah tersedia di setiap halaman
- ✅ Perfect untuk demo dan development
- ✅ Easy deployment (frontend only)

**Detail:** Lihat `MOCK_DATA_MODE.md`

## 🏗️ Tech Stack

- **Framework:** Next.js 15
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State:** React Hooks (useState, useEffect)

## 📁 Project Structure

```
my-app/
├── app/                      # Next.js App Router
│   ├── admin/               # Admin pages
│   │   ├── dashboard_admin/ # Dashboard
│   │   ├── manajemen_user/  # User management
│   │   ├── manajemen_peminjaman/ # Borrowing
│   │   ├── pengembalian/    # Returns
│   │   ├── rekap_laporan/   # Damage reports
│   │   └── kategori_barang/ # Categories
│   ├── auth/                # Authentication
│   │   ├── login/          # Login page
│   │   └── register/       # Register page
│   ├── landingpage/         # Public homepage
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # Reusable components
│   └── admin/              # Admin layout components
│       ├── AdminLayout.tsx  # Main admin layout
│       ├── Sidebar.tsx      # Sidebar navigation
│       ├── Navbar.tsx       # Top navbar with search
│       └── index.ts         # Barrel export
├── lib/                     # Utilities
│   └── api.tsx             # API helper (mock mode)
├── public/                  # Static assets
└── .env.local              # Environment variables

## 🎨 Admin Pages

### 1. Dashboard (`/admin/dashboard_admin`)
- Statistics cards (Total Assets, Active Borrowings, etc)
- Trend charts
- Recent activity feed
- Pending approvals table

### 2. Manage Users (`/admin/manajemen_user`)
- User list with search
- Role badges (Admin/User)
- Status badges (Active/Inactive)
- Filter by role
- Pagination

### 3. Manajemen Peminjaman (`/admin/manajemen_peminjaman`)
- Borrowing list
- Status filter (Pending, Active, Overdue)
- Validate borrowings
- Search functionality

### 4. Pengembalian (`/admin/pengembalian`)
- Return items list
- Overdue tracking with fines
- Status badges
- Confirm return action

### 5. Rekap Laporan (`/admin/rekap_laporan`)
- Damage reports list
- Status filter (Pending, In Progress, Resolved)
- Update status actions

### 6. Kategori Barang (`/admin/kategori_barang`)
- Category list with item counts
- CRUD operations
- Color-coded badges

## 🔍 Features Detail

### Search Bar (Navbar)
- Available on: User Management, Borrowings, Returns, Damage Reports
- Real-time search
- Filters mock data by name, email, item name, etc

### Responsive Layout
- Mobile: Stacked layout, hamburger menu
- Tablet: Grid layout, collapsible sidebar
- Desktop: Full layout with fixed sidebar

### UI/UX
- Modern design with rounded cards
- Smooth animations and transitions
- Color-coded status badges
- Interactive hover states
- Loading skeletons

## 🛠️ Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Lint Code
```bash
npm run lint
```

## 📦 Deployment

### Deploy ke Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Deploy ke Netlify
```bash
npm run build
# Upload folder ".next" ke Netlify
```

## 🎯 Environment Variables

File `.env.local`:
```env
# Mock Data Mode (default: true)
NEXT_PUBLIC_USE_MOCK_DATA=true
```

## 📝 Mock Data

Setiap halaman memiliki mock data hardcoded:

```typescript
// Example
const mockUsers = [
  { id: "1", full_name: "Sarah Jenkins", ... },
  { id: "2", full_name: "Michael Chen", ... },
];
```

Mock data automatis digunakan ketika API call gagal atau di mock mode.

## 🔐 Authentication (Mock)

Login page tidak memerlukan credentials real:
- Tidak validate ke backend
- Mock authentication flow
- Redirect langsung ke dashboard

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## 🎨 Color Palette

- **Primary**: `#0785BC` (Blue)
- **Success**: `#10B981` (Green)
- **Warning**: `#F59E0B` (Orange)
- **Danger**: `#EF4444` (Red)
- **Neutral**: Slate colors

## 📚 Documentation

- `MOCK_DATA_MODE.md` - Mock data mode explanation
- This README - Project overview

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

Private project for POKADA internal use.

## 👥 Team

Frontend Development Team - POKADA

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Mode:** Mock Data Only 🎭
