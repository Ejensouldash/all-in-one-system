# Panduan Migrasi Hosting: Dari Vercel ke Railway / Render

Dokumen ini menyediakan panduan langkah-demi-langkah untuk memindahkan projek **All in One System (ITSM Super App)** daripada Vercel ke platform baharu seperti **Railway** atau **Render**.

---

## 1. Fail Environment Variables (.env.production)

Fail `.env.production` telah dijana di dalam direktori utama projek. Ia mengandungi semua konfigurasi kritikal termasuk:
- **Database (Supabase PostgreSQL)**: `DATABASE_URL`, `DIRECT_URL`
- **Auth (NextAuth / Auth.js v5)**: `NEXTAUTH_SECRET`, `AUTH_TRUST_HOST`, `NEXTAUTH_URL`
- **AI Keys**: `GEMINI_API_KEY`, `NVIDIA_API_KEY`, `KIMI_K26_KEY`, `DEEPSEEK_V4_KEY`
- **Cloudflare R2**: `R2_BUCKET_NAME`, `R2_ACCOUNT_ID`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Cron**: `CRON_SECRET`
- **Email**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (Disimpan aktif menggantikan SMTP)
- **Google Drive & Calendar**: `GDRIVE_REFRESH_TOKEN`, dll.

> [!CAUTION]
> Fail `.env.production` dilindungi oleh `.gitignore` dan **TIDAK BOLEH** di-commit ke Git/GitHub.

---

## 2. Langkah Pemindahan ke Railway

Railway adalah salah satu platform paling mudah untuk aplikasi Next.js full-stack kerana ia menyokong *Raw Environment Editor*.

### Langkah 2.1: Buat Servis Baharu
1. Pergi ke [railway.app](https://railway.app) dan log masuk dengan akaun GitHub anda.
2. Klik **New Project** -> **Deploy from GitHub repo**.
3. Pilih repository `Ejensouldash/all-in-one-system`.

### Langkah 2.2: Masukkan Environment Variables Secara Pukal
1. Klik pada servis aplikasi anda di dashboard Railway.
2. Buka tab **Variables**.
3. Klik butang **Raw Editor** (di bahagian atas kanan jadual variable).
4. Buka fail `.env.production` di komputer anda, **Copy Semua Isinya**, dan **Paste** ke dalam kotak teks *Raw Editor* di Railway.
5. Klik **Save**.

### Langkah 2.3: Konfigurasi Domain & NEXTAUTH_URL
1. Di tab **Settings** servis Railway, pergi ke bahagian **Networking** -> Klik **Generate Domain** (contoh: `aio-production.up.railway.app`).
2. Kembali ke tab **Variables**, cari variable `NEXTAUTH_URL` dan kemas kini nilainya kepada domain tersebut:
   ```env
   NEXTAUTH_URL=https://aio-production.up.railway.app
   ```

### Langkah 2.4: Build & Start Command
Railway secara automatik mengesan Next.js. Namun, untuk memastikan Prisma Client sentiasa terjana sebelum build, pastikan:
- **Build Command**:
  ```bash
  npx prisma generate && npm run build
  ```
- **Start Command**:
  ```bash
  npm run start
  ```
  *(Next.js akan secara automatik mendengar pada `$PORT` yang diberikan oleh Railway).*

---

## 3. Langkah Pemindahan ke Render

Render juga menyokong Next.js melalui perkhidmatan *Web Service*.

### Langkah 3.1: Buat Web Service Baharu
1. Pergi ke [render.com](https://render.com) dan log masuk.
2. Klik **New +** -> **Web Service**.
3. Hubungkan repository GitHub: `Ejensouldash/all-in-one-system`.
4. Tetapan asas:
   - **Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run start
     ```

### Langkah 3.2: Masukkan Environment Variables
1. Tatal ke bawah ke bahagian **Environment Variables**.
2. Klik **Add from .env** atau buka tab **Secret Files** / tambah secara kelompok.
3. Salin nilai daripada `.env.production`.
4. Pastikan anda menetapkan `NEXTAUTH_URL` mengikut URL Render anda:
   ```env
   NEXTAUTH_URL=https://all-in-one-system.onrender.com
   ```

---

## 4. Pelarasan Penting dalam Kod Sebelum Deploy

### A. Next.js Server Actions `allowedOrigins`
Dalam fail [next.config.ts](file:///c:/Users/user/Documents/All%20in%20One%20System/next.config.ts), senarai `allowedOrigins` kini mengehadkan domain Vercel:
```ts
allowedOrigins: [
  'localhost:3000',
  '192.168.0.39:3000',
  '192.168.0.188:3000',
  'bubbleso2-aio.vercel.app',
  '*.vercel.app',
],
```
**Tindakan:** Tambahkan domain baharu anda ke dalam senarai ini, contohnya:
```ts
  '*.up.railway.app',
  '*.onrender.com',
```
atau domain rasmi anda sendiri untuk mengelakkan ralat CORS pada Server Actions.

### B. Prisma Postinstall (Disyorkan)
Untuk memudahkan mana-mana platform CI/CD menjana Prisma Client tanpa perlu menukar arahan build lalai, anda boleh menambah skrip `postinstall` dalam [package.json](file:///c:/Users/user/Documents/All%20in%20One%20System/package.json):
```json
"scripts": {
  "postinstall": "prisma generate",
  ...
}
```

---

## 5. Ringkasan Senarai Semak (Checklist)

- [x] Ekstrak ENV daripada Vercel & selaraskan ke `.env.production`.
- [x] Pastikan `.env.production` diabaikan oleh `.gitignore`.
- [ ] Import seluruh variable ke Railway / Render melalui *Raw Editor*.
- [ ] Kemas kini `NEXTAUTH_URL` mengikut URL domain baharu.
- [ ] Tambah domain baharu ke dalam `allowedOrigins` pada `next.config.ts`.
- [ ] Sahkan sambungan ke Supabase PostgreSQL & Cloudflare R2 berjaya semasa staging deploy.
