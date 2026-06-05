# AutoERP Pro v2

Zamonaviy biznes uchun ombor va savdo boshqaruvi tizimi. Ushbu loyiha React (Vite + TanStack Router), Zustand, Tailwind CSS hamda Node.js (Express + Supabase/Local JSON) asosida qurilgan.

## Asosiy Texnologiyalar

### Frontend
- **React 19**
- **Vite** - Tezkor build tool
- **TanStack Router** - Zamonaviy va type-safe routing
- **Zustand** - Global state management
- **Tailwind CSS v4** - Styling
- **Radix UI / shadcn/ui** - Qulay va accessibility uchun moslashtirilgan UI komponentlar
- **TypeScript** - Qat'iy tiplashtirish

### Backend
- **Node.js & Express** - API server
- **Supabase** (yoki local JSON) - Ma'lumotlar bazasi
- **JWT (JSON Web Token)** - Autentifikatsiya

## O'rnatish va Ishga Tushirish

### 1. Loyihani yuklab olish va paketlarni o'rnatish
```bash
git clone <repository_url>
cd ombor-dasturi
yarn install
```

### 2. Muhit o'zgaruvchilarini sozlash (Environment Variables)
Root papkada `.env` faylini yarating va quyidagi o'zgaruvchilarni kiriting:
```env
# JWT Secret for backend
JWT_SECRET=your_jwt_secret_key_here

# Supabase (ixtiyoriy)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Port (ixtiyoriy, default 3001)
PORT=3001
```

### 3. Ilovani ishga tushirish

Frontend qismini ishga tushirish:
```bash
yarn dev
```

Backend qismini ishga tushirish (alohida terminalda):
```bash
cd backend
npm run dev
```

Loyihani build qilish (Frontend):
```bash
yarn build
```

## Testlarni Ishga Tushirish

Loyiha Vitest orqali test qilinadi. Barcha testlarni (frontend va backend) yuritish:
```bash
yarn test
```

## Loyiha Strukturasi

- `/src` - Frontend kodlari (Komponentlar, marshrutlar, utilitalar)
  - `/components` - Qayta ishlanadigan UI komponentlar
  - `/lib` - Zustand store, API xizmatlari va TypeScript tiplari
  - `/routes` - TanStack Router marshrutlari va sahifalar
- `/backend` - Express API serveri
  - `/routes` - API endpointlari
  - `/middleware` - Autentifikatsiya va Rate Limit middleware
  - `server.js` - Backend serverining asosiy kirish nuqtasi

## Hujjatlar
Barcha API endpointlar haqida ma'lumot olish uchun [API.md](./API.md) faylini o'qing.
