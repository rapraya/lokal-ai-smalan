# Panduan Deployment Secure AI Gateway — Lokal AI SMALAN

Panduan ini untuk memasang gateway GPT pada domain ai.smalan.sch.id. Kerjakan berurutan. Jangan menjalankan deployment sebelum seluruh prasyarat Cloudflare dan secret OpenAI siap.

## Prinsip deployment

- Website Lokal AI tetap dapat dibuka publik seperti sebelumnya.
- Hanya endpoint /api/* yang dilindungi Cloudflare Access.
- Worker hanya menerima route ai.smalan.sch.id/api/*.
- workers_dev dimatikan pada konfigurasi produksi.
- API key OpenAI disimpan sebagai Worker Secret, bukan di file proyek.
- GPT tidak akan aktif sampai health check gateway menyatakan siap.

## A. Persiapkan Cloudflare

1. Pastikan zone smalan.sch.id sudah aktif di akun Cloudflare yang akan dipakai.
2. Pastikan DNS ai.smalan.sch.id melewati Cloudflare (proxy/orange cloud aktif). Jangan mengubah record website utama atau subdomain lain.
3. Di Cloudflare Zero Trust, buka Access controls → Applications → Add application → Self-hosted.
4. Tambahkan hostname ai.smalan.sch.id dengan path /api/* saja. Jangan melindungi seluruh hostname.
5. Buat policy Allow yang hanya mencantumkan email pengguna yang benar-benar boleh memakai GPT. Access menolak pengguna secara default bila tidak cocok dengan policy Allow.
6. Siapkan Identity Provider untuk proses login.
7. Salin dua nilai berikut dari konfigurasi Access:
   - Team domain, misalnya nama-team.cloudflareaccess.com.
   - Application Audience (AUD) tag.

Penting: daftar email di policy Access dan ALLOWED_EMAILS harus sama. Jangan gunakan policy Everyone untuk endpoint yang memakai kuota API berbayar.

## B. Siapkan konfigurasi proyek

Buka PowerShell:

~~~powershell
cd D:\Project\lokal-ai-smalan\gateway
~~~

Edit wrangler.jsonc:

- ACCESS_TEAM_DOMAIN: isi team domain yang sebenarnya.
- ACCESS_AUD: isi Application AUD tag.
- ALLOWED_EMAILS: isi email yang disetujui, dipisahkan koma.

Jangan mengubah nilai berikut tanpa alasan teknis:
- APP_ORIGIN: https://ai.smalan.sch.id.
- Route: ai.smalan.sch.id/api/*.
- Zone: smalan.sch.id.
- workers_dev: false.
- Allowlist model GPT: gpt-6.1-sol,gpt-6-luna.
- Rate limit awal: 10 permintaan per 60 detik per identitas.

## C. Simpan API key OpenAI sebagai secret

Buat API key dari proyek OpenAI yang khusus dipakai Lokal AI SMALAN. Jangan memakai key yang sama dengan proyek lain. Aktifkan pemantauan penggunaan dan batas pengeluaran sesuai kebijakan akun.

Di PowerShell yang masih berada pada folder gateway:

~~~powershell
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret list
~~~

Saat perintah pertama dijalankan, login ke akun Cloudflare yang memiliki zone smalan.sch.id. Saat perintah kedua meminta nilai secret, masukkan API key secara langsung ke prompt terminal. Jangan menuliskannya di chat, file, atau GitHub.

Perintah secret list hanya untuk memastikan nama secret tersedia; nilai rahasianya tidak ditampilkan.

## D. Pemeriksaan sebelum deployment

Masih di folder gateway, jalankan:

~~~powershell
npm run check:deploy
~~~

Pemeriksaan akan menolak deployment bila:
- Team domain, AUD, atau email masih placeholder.
- Route bukan tepat ai.smalan.sch.id/api/*.
- workers_dev masih aktif.
- API key ditaruh di vars alih-alih Worker Secret.
- Model tidak ada dalam allowlist yang ditinjau.
- Rate limiter hilang atau nilainya melewati batas awal.

Pemeriksaan ini hanya membaca konfigurasi lokal. Pemeriksaan tersebut tidak login ke Cloudflare, tidak memeriksa policy Access di dashboard, tidak membaca nilai secret, dan tidak mengubah layanan online.

## E. Deployment

Jalankan hanya setelah tahap A–D benar-benar selesai:

~~~powershell
npm run deploy
~~~

Script akan mengulang pemeriksaan konfigurasi, kemudian menjalankan Wrangler deploy. Route yang dipasang hanya /api/*; root website dan path lain tidak diganti oleh Worker.

Deployment ini mengubah konfigurasi Worker pada akun Cloudflare dan mengaktifkan route API. Jangan menjalankannya sebelum yakin akun, zone, policy, dan secret yang dipilih sudah benar.

## F. Tes setelah deployment

1. Buka tab baru: https://ai.smalan.sch.id/api/health.
2. Pada kunjungan pertama, Cloudflare Access seharusnya meminta login. Setelah berhasil, endpoint mengembalikan status gateway dan daftar model.
3. Kembali ke Lokal AI, buka Model Engine, lalu tekan Periksa ulang koneksi.
4. Status OpenAI berubah menjadi Gateway siap bila autentikasi, secret, dan rate limiter sudah benar.
5. Buka AI Chat, pilih OpenAI GPT, pilih model, centang persetujuan cloud, lalu kirim pertanyaan sederhana seperti: Jawab hanya dengan kata Gateway GPT aktif.
6. Pastikan jawaban masuk melalui streaming. Ulangi tanpa mencentang persetujuan untuk memastikan pengiriman ditolak.

## G. Arti status umum

| Status | Arti / pemeriksaan |
|---|---|
| 401 | Header Access tidak ada, sesi tidak valid, atau team domain/AUD salah. |
| 403 | Email tidak masuk policy Access atau ALLOWED_EMAILS. |
| 404 | Route Worker belum aktif atau DNS belum melewati Cloudflare. |
| 429 | Batas permintaan gateway atau provider tercapai. |
| 503 | Secret OpenAI, konfigurasi Access, atau rate limiter belum lengkap. |
| Gateway siap | Health check telah terautentikasi dan secret serta rate limiter terdeteksi. |

## Batas biaya dan keamanan

Rate limiter Worker Cloudflare bersifat perkiraan dan lokal per lokasi Cloudflare, bukan batas pengeluaran global yang ketat. Tetapkan juga kontrol penggunaan/pengeluaran pada proyek OpenAI dan pantau pemakaian. Gateway membatasi keluaran maksimal 2.048 token per permintaan.

Jangan mengaktifkan pengiriman AI Knowledge, CSV, Personal AI, atau data sekolah ke cloud melalui jalur ini. Integrasi saat ini hanya untuk percakapan AI Chat yang secara eksplisit disetujui pengguna. Claude dan Gemini belum terhubung.
