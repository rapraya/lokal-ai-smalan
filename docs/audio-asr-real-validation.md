# Validasi Nyata Audio ASR (Whisper Tiny)

Dokumen ini melengkapi Browser Smoke. Browser Smoke memakai pipeline Whisper tiruan untuk menguji integrasi UI, worker, hasil, ekspor, pembatalan, dan pembersihan resource. Tes tersebut **bukan** pengukuran kualitas model Whisper yang sebenarnya.

## Tujuan

Memverifikasi bahwa model `onnx-community/whisper-tiny` benar-benar dapat dimuat dan melakukan inferensi di browser, terutama untuk audio Bahasa Indonesia, tanpa mengirim audio pengguna ke layanan inferensi cloud.

## Batasan dan prasyarat

- Jalankan pada build aplikasi yang sudah dipublikasikan melalui HTTPS. Jangan menganggap alamat preview atau domain produksi tersedia sebelum benar-benar diperiksa.
- Browser perlu mengunduh runtime dan bobot model pada pemakaian pertama. Karena itu, pemakaian pertama memerlukan koneksi internet; pemrosesan audio setelah model siap berlangsung di browser.
- Gunakan rekaman uji yang memang boleh dipakai untuk pengujian. Hindari rekaman peserta didik, data pribadi, atau percakapan sensitif.
- Catat browser, versi browser, sistem operasi, perangkat, dan apakah model sudah pernah di-cache.
- Jangan mengaktifkan Cloud Gateway untuk menjalankan validasi ini.

## Prosedur uji

### 1. Pemuatan model nyata

1. Buka Audio Lab dan pilih berkas audio uji.
2. Pilih bahasa Indonesia.
3. Tekan tombol muat model Whisper Tiny.
4. Tunggu hingga status model menyatakan siap.
5. Catat durasi unduh, ukuran unduhan yang dilaporkan browser bila tersedia, dan apakah terjadi kegagalan jaringan atau memori.

**Lulus jika:** worker selesai memuat model nyata, status siap tampil, dan tidak ada error pemuatan. Kegagalan jaringan harus dapat dicoba ulang tanpa memuat ulang seluruh aplikasi.

### 2. Transkripsi Bahasa Indonesia

Gunakan rekaman pendek 10–30 detik dengan kalimat yang sudah ditranskripsikan secara manual sebagai referensi.

1. Putar rekaman dan pastikan suara dapat didengar dengan jelas.
2. Jalankan transkripsi dengan bahasa Indonesia.
3. Bandingkan keluaran dengan transkrip referensi.
4. Catat kata yang hilang, berubah, atau ditambahkan; jangan hanya menilai apakah hasil tidak kosong.

**Lulus fungsional jika:** inferensi selesai dan menghasilkan teks. **Kualitas belum dinyatakan lulus** sampai hasil dibandingkan dengan referensi dan tingkat kesalahan kata (WER) dihitung atau ditinjau secara konsisten.

### 3. Bahasa otomatis dan Bahasa Inggris

1. Ulangi pengujian dengan pilihan deteksi otomatis pada rekaman Indonesia.
2. Uji rekaman Bahasa Inggris terpisah dengan pilihan English.
3. Catat apakah deteksi bahasa dan hasil transkripsi sesuai dengan bahasa rekaman.

### 4. Rentang, timestamp, dan ekspor

1. Uji rentang tepat 1 detik dan rentang pendek yang kurang dari 1 detik.
2. Uji rentang maksimal 120 detik.
3. Uji dua rentang berurutan dengan opsi append aktif.
4. Ekspor TXT dan SRT; periksa timestamp terhadap posisi rentang sumber.

**Lulus jika:** batas rentang diterapkan, segmen tidak tertukar/terduplikasi, offset timestamp benar, dan berkas ekspor dapat dibuka.

### 5. Pembatalan dan pemulihan

1. Mulai inferensi pada audio yang cukup panjang.
2. Batalkan saat proses berlangsung.
3. Pastikan status berubah menjadi dibatalkan dan tombol muat model dapat digunakan kembali.
4. Jalankan pemuatan/transkripsi baru setelah pembatalan.
5. Ulangi dengan berpindah halaman atau menutup Audio Lab saat proses berjalan.

**Lulus jika:** hasil lama tidak muncul setelah pembatalan, worker lama tidak mengganggu permintaan baru, dan aplikasi tetap responsif.

### 6. Isolasi audio dan TTS

1. Buka DevTools Network sebelum memilih audio.
2. Muat model dan jalankan transkripsi.
3. Periksa permintaan jaringan: unduhan runtime/model diperbolehkan, tetapi berkas audio pengguna atau buffer audio tidak boleh dikirim sebagai payload ke endpoint aplikasi atau layanan inferensi.
4. Pastikan ASR dan TTS tidak berjalan bersamaan jika penguncian proses memang diberlakukan.
5. Uji TTS secara terpisah dan pertahankan persetujuan lisensi yang sudah ada.

**Lulus jika:** audio sumber tetap diproses lokal dan tidak ada request yang mengunggah audio untuk inferensi. Jangan menyamakan unduhan model dari CDN dengan pengiriman audio pengguna.

## Catatan hasil

Isi tabel ini setelah pengujian nyata dilakukan. Jangan menandai lulus berdasarkan mock Browser Smoke.

| Pengujian | Hasil | Catatan |
| --- | --- | --- |
| Muat model nyata | Belum diuji | |
| Transkripsi Indonesia + referensi | Belum diuji | |
| Deteksi bahasa otomatis | Belum diuji | |
| Transkripsi Inggris | Belum diuji | |
| Rentang dan timestamp | Belum diuji | |
| Ekspor TXT/SRT | Belum diuji | |
| Pembatalan dan pemulihan | Belum diuji | |
| Isolasi audio pada Network | Belum diuji | |
| Konflik ASR/TTS | Belum diuji | |
| Uji perangkat/browser kedua | Belum diuji | |

## Kriteria keputusan

- **Lulus fungsional:** seluruh alur pemuatan, inferensi, rentang, ekspor, pembatalan, dan pemulihan bekerja.
- **Lulus privasi:** pemeriksaan Network tidak menemukan pengiriman audio pengguna ke endpoint inferensi.
- **Lulus kualitas:** transkrip dibandingkan dengan referensi yang benar; kualitas dinilai dari kesalahan kata dan keterbacaan, bukan sekadar keluaran nonkosong.
- **Belum tervalidasi:** setiap bagian yang belum diuji dengan model nyata tetap berstatus belum diuji.

Jangan mengklaim dukungan offline penuh untuk pemakaian pertama. Unduhan runtime dan model membutuhkan jaringan kecuali seluruh aset telah tersedia di cache browser.
