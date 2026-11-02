# Lokal AI SMALAN — UI Design System

Dokumen ini menjadi acuan visual untuk seluruh halaman dan modul Lokal AI SMALAN. Perubahan berikutnya harus menggunakan komponen, token, dan pola interaksi yang sama agar aplikasi tetap terasa sebagai satu produk.

## 1. Arah desain

**Modern Premium — calm, capable, and clear.**

Prinsip:
- Antarmuka harus terasa profesional, tenang, dan mudah dipindai.
- Hierarki informasi lebih penting daripada dekorasi.
- Warna dipakai untuk membedakan tema, kategori, dan status; bukan untuk mewarnai setiap elemen.
- Setiap kontrol harus memiliki tujuan dan perilaku yang jelas.
- Jangan menampilkan fitur roadmap seolah-olah sudah berfungsi.
- Prioritaskan Bahasa Indonesia yang ringkas dan mudah dipahami.
- Pertahankan aksesibilitas, keterbacaan, dan responsivitas di semua tema.

## 2. Tiga tema

Semua tema memakai markup, komponen, ukuran, dan perilaku yang sama. Hanya token visual yang berubah.

### Dark
- Latar aplikasi: `#090E1B`
- Sidebar: `#0D1424`
- Permukaan utama: `#111A2B`
- Permukaan sekunder: `#151F33`
- Teks utama: `#EDF3FC`
- Teks sekunder: `#95A4BB`
- Aksen biru: `#90B8FF`
- Aksen teal: `#73DBC8`

Gunakan permukaan berlapis dan garis pembatas tipis. Hindari panel gelap yang terlalu kontras satu sama lain.

### Light
- Latar aplikasi: `#F2F5FA`
- Sidebar dan permukaan utama: putih
- Permukaan sekunder: `#F5F7FB`
- Teks utama: `#19263B`
- Teks sekunder: `#66768D`

Gunakan putih sebagai ruang kerja, abu-abu kebiruan untuk permukaan sekunder, dan biru untuk fokus/interaksi.

### Colorful
- Latar aplikasi: `#F5F4FF`
- Permukaan utama: putih
- Permukaan sekunder: `#FAF9FF`
- Teks utama: `#252544`
- Teks sekunder: `#706F91`
- Aksen biru: `#4E7EE7`
- Aksen ungu: `#945CE8`
- Aksen pink: `#E85C9C`
- Aksen teal: `#27B89B`
- Aksen oranye: `#ED9B37`

Warna cerah digunakan terutama untuk ikon kategori, ilustrasi, penanda status, dan aksen terpilih. Panel kerja tetap terang dan bersih. Hindari gradasi kuat di setiap kartu.

## 3. Layout aplikasi

| Bagian | Standar |
|---|---|
| Sidebar desktop | 270 px |
| Topbar desktop | 68 px |
| Sidebar mobile | maksimal 88vw |
| Workspace | lebar penuh dari area konten yang tersedia |
| Padding konten desktop | responsif, sekitar 24–46 px |
| Padding konten ponsel | 14–20 px |
| Radius kartu | 14–16 px |
| Radius kontrol | sekitar 10 px |

Sidebar menggunakan navigasi berkelompok dan area gulir internal. Bagian preferensi dan metadata versi tetap berada di bawah. Di layar kecil, sidebar berubah menjadi drawer dengan overlay; konten utama menggunakan seluruh lebar viewport.

## 4. Navigasi

Kelompok navigasi tetap:
1. Utama — Overview
2. AI Studio — AI Chat, AI Coding
3. Creative Studio — Image Studio, Audio Lab, Video Studio
4. Intelligence — Text & Language, Data Analyst, AI Knowledge
5. Assistant — AI Assistant, Personal AI, AI Navigator
6. Preferensi — Model Engine, Pengaturan

Aturan:
- Gunakan satu keluarga ikon outline dengan ukuran dan stroke konsisten.
- Menu aktif memiliki latar lembut, teks lebih tegas, dan indikator aksen di sisi kiri.
- Jangan memakai angka urut dekoratif.
- Status Alpha/Rencana hanya ditampilkan untuk menjelaskan kematangan fitur.
- Navigasi aktif harus mempertahankan `aria-current="page"`.
- Jangan membuat elemen statis tampak seperti tombol yang dapat digunakan.

## 5. Tipografi

Font UI: DM Sans. Font display/judul: Manrope.

| Peran | Ukuran acuan |
|---|---:|
| Judul halaman | 28–34 px |
| Judul Overview | 30–40 px |
| Judul panel | 17–20 px |
| Teks isi | 14–15 px |
| Label dan kontrol | 13–14 px |
| Metadata | minimum 12 px |

Jaga kontras teks sekunder. Jangan menggunakan warna pucat untuk paragraf panjang. Gunakan angka tabular untuk metrik, ukuran, dan progres bila relevan.

## 6. Komponen

### Cards
- Kartu memakai border halus, radius konsisten, dan bayangan sangat ringan.
- Hover hanya memberi umpan balik halus; jangan mengandalkan hover sebagai satu-satunya indikator interaksi.
- Kartu unggulan boleh memiliki ruang lebih besar, tetapi jangan membuat seluruh kartu menggunakan gradasi.
- Judul, deskripsi, status, dan aksi harus memiliki urutan yang konsisten.

### Buttons
- Primary: satu aksi utama per area kerja.
- Secondary/quiet: aksi pendamping dengan bobot visual lebih ringan.
- Destructive: hanya untuk tindakan yang benar-benar menghapus atau membatalkan.
- Keadaan disabled, loading, hover, focus, dan active harus terlihat jelas.

### Forms
- Input mengisi lebar kolom yang tersedia.
- Label berada di atas kontrol dan memiliki jarak yang konsisten.
- Tinggi kontrol interaktif minimum sekitar 42 px.
- Placeholder adalah contoh, bukan pengganti label.
- Pesan validasi/status ditempatkan dekat kontrol yang terkait.

### Status
- Gunakan status yang faktual: Aktif, Alpha, Direncanakan, Memuat, Siap, Gagal.
- Jangan menampilkan status aktif hanya karena ada indikator dekoratif.
- Status warna harus disertai teks atau keterangan yang dapat dibaca.

### AI output and evidence
- Pisahkan jawaban, peringatan, verifikasi, dan sumber.
- Teks yang belum terverifikasi tidak boleh ditampilkan seolah-olah kesimpulan yang didukung sumber.
- Informasi proses/kemampuan model harus sesuai implementasi yang benar-benar tersedia.

## 7. Overview

Urutan konten:
1. Sambutan dan konteks workspace.
2. Hero dengan satu pesan utama dan aksi yang jelas.
3. Daftar kemampuan berbentuk grid/bento.
4. Status perangkat/model bila relevan.
5. Informasi privasi dan footer.

Tampilkan jumlah kemampuan yang benar. Bedakan fitur yang sudah terintegrasi dari Alpha dan roadmap. Jangan menambah kartu dekoratif yang tidak memberi informasi atau tindakan berguna.

## 8. Responsivitas dan aksesibilitas

- Desktop, tablet, dan ponsel harus menggunakan layout yang disengaja; bukan sekadar mengecilkan desktop.
- Hindari overflow horizontal pada seluruh halaman; tabel boleh memakai area gulir sendiri.
- Semua kontrol keyboard harus memiliki focus ring yang jelas.
- Hormati `prefers-reduced-motion`.
- Gunakan elemen semantik dan label aksesibel.
- Ukuran teks antarmuka tidak boleh di bawah 12 px.
- Uji ketiga tema, ukuran desktop, tablet, dan ponsel sebelum menyatakan UI siap.

## 9. Checklist untuk modul baru

Sebelum modul diterima:
- [ ] Memakai token tema, komponen, radius, dan spacing yang sudah ada.
- [ ] Konsisten dengan sidebar, topbar, dan pola judul halaman.
- [ ] Terbaca dalam Dark, Light, dan Colorful.
- [ ] Responsif pada desktop, tablet, dan ponsel.
- [ ] Label, status, disabled, loading, error, dan empty state jelas.
- [ ] Tidak menyatakan fitur aktif bila implementasi belum ada.
- [ ] Kontrol memiliki label aksesibel dan focus state.
- [ ] Tes smoke/sintaks yang relevan lulus.
- [ ] Preview browser nyata telah diperiksa sebelum rilis UI dinyatakan final.

## 10. Implementasi

Token dan aturan visual aktif berada di `assets/css/style.css`. Markup shell ada di `index.html`; pemilihan tema dan navigasi dinamis ada di `assets/js/app.js`.

Jika aturan berubah, perbarui stylesheet, pengujian smoke, dan dokumen ini dalam rangkaian perubahan yang sama.
