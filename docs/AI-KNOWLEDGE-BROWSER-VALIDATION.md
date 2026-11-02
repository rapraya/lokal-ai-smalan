# AI Knowledge — Browser Validation Checklist

Dokumen ini memisahkan hasil pengujian otomatis dari validasi browser/perangkat nyata. Jangan tandai skenario sebagai lulus sebelum benar-benar dijalankan.

## 1. Persiapan aman

1. Gunakan salinan dokumen uji, bukan dokumen peserta didik atau dokumen internal yang bersifat rahasia.
2. Jalankan aplikasi melalui `http://localhost` atau HTTPS. Jangan membuka aplikasi langsung melalui `file://`.
3. Gunakan browser desktop terbaru. Pastikan koneksi internet tersedia untuk mengunduh runtime dan model embedding saat fitur diaktifkan.
4. Buka DevTools → Console dan Network. Catat browser, sistem operasi, RAM perangkat (bila diketahui), dan waktu pengujian.

**Catatan privasi:** mengaktifkan semantik akan mengunduh Transformers.js dari jsDelivr dan model ONNX dari Hugging Face. Isi dokumen dan pertanyaan diproses oleh worker di browser; permintaan unduhan model bukan unggahan dokumen. Saat pengujian, Network panel boleh menampilkan aset runtime/model, tetapi tidak boleh menampilkan isi dokumen atau pertanyaan sebagai payload permintaan ke layanan tersebut.

## 2. Skenario model semantik

| ID | Langkah | Hasil yang diharapkan |
|---|---|---|
| SEM-01 | Buka AI Knowledge tanpa memuat dokumen. | Opsi semantik tidak dapat diaktifkan; tidak ada unduhan model. |
| SEM-02 | Muat satu file TXT/Markdown kecil, lalu aktifkan pencarian semantik. | Status menampilkan proses unduhan/runtime dan embedding; UI tidak membeku. |
| SEM-03 | Tunggu hingga pemuatan selesai. | Status menunjukkan semantik aktif dan BM25 tetap digabungkan. |
| SEM-04 | Muat dokumen kedua saat semantik aktif. | Embedding koleksi dibangun ulang; pencarian tetap berjalan pada kedua dokumen. |
| SEM-05 | Hapus satu dokumen dari koleksi. | Embedding dibangun ulang; kutipan tidak menunjuk indeks halaman dokumen yang salah. |
| SEM-06 | Hapus dokumen terakhir atau pilih Hapus seluruh koleksi. | Worker semantik ditutup, embedding sesi dikosongkan, dan opsi semantik kembali nonaktif. |
| SEM-07 | Muat dokumen lagi setelah SEM-06. | Semantik hanya aktif kembali setelah pengguna memberi persetujuan. |

Model ONNX quantized yang dipilih berukuran sekitar 118 MB. Unduhan runtime merupakan tambahan, dan penggunaan RAM aktif dapat lebih besar daripada ukuran berkas model. Hentikan pengujian bila browser kehabisan memori atau sistem menjadi tidak stabil.

## 3. Skenario kualitas pencarian dan RAG

Siapkan dokumen uji yang berisi informasi dengan parafrasa, bukan hanya kata yang sama.

Contoh:
- Isi dokumen: “Sekolah menyediakan bantuan biaya pendidikan bagi peserta didik yang memenuhi kriteria.”
- Pertanyaan: “Apa dukungan finansial yang tersedia untuk siswa?”

Periksa hal berikut:
- Sumber yang relevan muncul meskipun pertanyaan tidak memakai frasa yang sama persis.
- Nama dokumen dan halaman/bagian tetap tepat.
- Potongan teks yang ditampilkan memang berasal dari halaman/bagian tersebut.
- BM25 masih berfungsi ketika opsi semantik dinonaktifkan.
- Bila embedding pertanyaan gagal, status menjelaskan bahwa pencarian beralih ke BM25.
- Model yang menjawab hanya menerima kutipan terpilih; jawaban harus menyatakan bila bukti tidak cukup.

Ambang cosine similarity 0,35 adalah pengaman awal, bukan jaminan akurasi. Nilai tersebut perlu dievaluasi dengan beberapa dokumen sekolah dan pertanyaan representatif.

## 4. Pemeriksaan penanda sumber

Uji tiga keadaan jawaban model:
1. Jawaban memakai `[S1]` atau penanda yang tersedia: status menyatakan penanda sesuai daftar kutipan, tetapi klaim tetap perlu diperiksa secara manual.
2. Jawaban memakai `[S9]` ketika hanya ada lima sumber: status harus memperingatkan bahwa sumber tersebut tidak tersedia.
3. Jawaban tidak memakai `[S#]`: status harus memperingatkan bahwa jawaban tidak menyertakan penanda sumber.

Pemeriksaan ini hanya memvalidasi nomor penanda, bukan membuktikan bahwa sebuah kutipan benar-benar mendukung klaim.

## 5. Skenario PDF dan OCR

1. Impor PDF yang memiliki teks tertanam. Pastikan teks dan nomor halaman terbaca.
2. Impor PDF hasil scan dengan OCR tetap nonaktif. Pastikan aplikasi menjelaskan bahwa teks tidak ditemukan dan meminta OCR diaktifkan.
3. Aktifkan OCR secara eksplisit, lalu unggah ulang salinan PDF scan. Pastikan progres dan jumlah halaman OCR ditampilkan.
4. Gunakan scan yang jelas dan uji sebagian scan yang kurang jelas. Periksa kesalahan OCR terhadap PDF asli.
5. Pastikan batas 20 halaman OCR per PDF dan peringatan kegagalan tetap ditampilkan.

## 6. Pemeriksaan Network dan memori

- Pastikan permintaan eksternal hanya untuk runtime/model yang memang diaktifkan dan dependensi lain yang dipicu pengguna.
- Pastikan teks dokumen, prompt, dan kutipan tidak dikirim sebagai payload ke CDN atau Hugging Face.
- Saat menghapus koleksi, periksa bahwa worker telah ditutup dan memori sesi dokumen/embedding dilepas.
- Jangan menganggap penghapusan koleksi menghapus file model yang telah tersimpan di cache browser. Cache aset dapat tetap ada sesuai kebijakan runtime/browser.
- Uji sekali pada perangkat dengan RAM terbatas; catat waktu unduh, waktu embedding, waktu pencarian, dan indikasi tekanan memori.

## 7. Catatan hasil pengujian

Isi setelah pengujian nyata dilakukan.

| Tanggal | Browser/perangkat | Skenario | Hasil | Catatan/bukti |
|---|---|---|---|---|
| — | — | — | Belum diuji | — |

**Status saat checklist dibuat:** pengujian otomatis CI untuk helper retrieval, batas chunk, metadata sumber, fallback BM25, dan penanda sitasi tersedia. Pengujian browser nyata, unduhan model, kualitas retrieval pada dokumen sekolah, OCR akurat, dan penggunaan RAM belum dinyatakan lulus.

## 8. Mode ringkasan dan perbandingan lintas dokumen

1. Muat dua hingga lima dokumen uji yang topiknya saling berkaitan.
2. Pilih **Ringkas setiap dokumen** dan jalankan tanpa fokus tambahan. Pastikan setiap dokumen memiliki bagian ringkasan sendiri serta maksimal tiga bagian representatif yang digunakan.
3. Ulangi ringkasan dengan fokus tertentu, misalnya tujuan program atau persyaratan. Pastikan model tidak menyimpulkan hal yang tidak terlihat di kutipan.
4. Pilih **Bandingkan antardokumen**, masukkan satu aspek yang sama untuk dibandingkan, lalu jalankan.
5. Periksa apakah kutipan yang dipilih berasal dari beberapa dokumen, maksimal dua bagian per dokumen dan maksimal sepuluh bagian keseluruhan.
6. Uji pertanyaan yang hanya relevan untuk satu atau dua file. Dokumen lain yang tidak memiliki bukti terpilih harus ditandai sebagai tidak terwakili; jangan menyimpulkan isi file tersebut.
7. Periksa semua penanda [S#] satu per satu terhadap nama file, nomor halaman/bagian, dan kutipan yang ditampilkan.

**Batasan:** ringkasan menggunakan sampel awal, tengah, dan akhir, bukan pembacaan menyeluruh setiap halaman. Perbandingan hanya mencakup dokumen yang memiliki bukti terpilih. Kedua mode tetap memerlukan pemeriksaan manusia terhadap jawaban model.
