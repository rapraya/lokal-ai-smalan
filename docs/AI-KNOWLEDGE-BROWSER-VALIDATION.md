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

## 9. Struktur bagian dan pengelompokan bukti (Advanced RAG)

1. Gunakan dokumen uji PDF yang memiliki judul bagian bernomor atau judul singkat dengan huruf kapital, serta Markdown yang menggunakan heading `#` / `##`.
2. Muat dokumen tersebut dan jalankan pertanyaan yang relevan dengan salah satu judul bagian. Pastikan kutipan yang sesuai dapat ditemukan meskipun istilah pertanyaan tidak seluruhnya muncul pada isi paragraf.
3. Periksa sumber yang ditampilkan: bagian/heading harus masuk akal, nomor halaman tetap sesuai, dan penanda [S#] tetap merujuk kutipan yang benar.
4. Muat dua dokumen dengan heading yang sama (misalnya **Tujuan**) dan pastikan bukti dapat dikelompokkan pada label bagian/topik yang sama tanpa mencampur identitas dokumen atau nomor halamannya.
5. Uji juga dokumen tanpa heading. Bagian tersebut harus tetap dapat dicari dan diberi label fallback **Bagian awal**, bukan hilang dari koleksi.
6. Bandingkan hasil PDF teks asli dengan PDF hasil scan/OCR. Heading OCR mungkin tidak dikenali karena pemisahan baris dan kualitas pengenalan teks berbeda-beda.

**Batasan:** heading dideteksi secara heuristik dari Markdown, pola penomoran, dan baris pendek huruf kapital. Ekstraksi tabel menggunakan koordinat teks PDF dan jarak horizontal sebagai perkiraan; fitur ini belum memahami outline/bookmark PDF, header berulang, sel gabungan, border, tabel bersarang, atau struktur dokumen kompleks. Periksa label bagian dan setiap baris/kolom terhadap dokumen asli.

## 10. Ekstraksi kolom PDF dan indikasi tabel (Advanced RAG)

1. Siapkan PDF teks asli dengan tabel sederhana minimal dua kolom dan beberapa baris, misalnya **Nama | Nilai**. Gunakan salinan data uji, bukan data pribadi.
2. Impor PDF dan jalankan pertanyaan yang membutuhkan hubungan antara label kolom dan nilainya.
3. Periksa kutipan sumber. Baris tabel semestinya mempertahankan urutan baca dan pemisah TAB; label sumber dapat menampilkan **Indikasi tabel N baris** bila pola kolom berulang terdeteksi.
4. Bandingkan nilai pada kutipan dengan tabel asli. Pastikan kolom tidak tertukar dan jangan menganggap label indikasi tabel sebagai jaminan semua sel berhasil diekstrak.
5. Uji PDF tanpa metadata posisi teks yang lengkap. Jalur fallback harus tetap menampilkan teks dan tidak menambahkan label tabel secara keliru.
6. Uji OCR dengan scan tabel. OCR hanya mempertahankan baris yang dikenali; tabel hasil OCR belum memakai rekonstruksi koordinat kolom sehingga hasilnya harus diperiksa lebih teliti.
7. Uji tabel dengan header berulang, beberapa kolom, halaman lanjutan, angka desimal, sel kosong, serta teks paragraf biasa yang memiliki indentasi lebar untuk melihat potensi salah deteksi.

**Batasan:** pemisah TAB dan jumlah baris adalah perkiraan dari posisi teks yang diekstrak PDF.js. Header, satuan, sel gabungan, garis tabel, dan makna setiap kolom tidak dipahami secara penuh oleh parser. Model hanya menerima kutipan yang terpilih dan dibatasi panjangnya; tabel panjang dapat terpotong. Hasil harus diverifikasi terhadap PDF asli.

## 11. Sintesis seimbang lintas dokumen

1. Muat sedikitnya tiga dokumen uji yang membahas satu tema dari sudut pandang atau periode berbeda.
2. Ajukan pertanyaan yang memiliki bukti relevan di lebih dari satu dokumen. Periksa bahwa hasil dapat mengambil maksimal dua kutipan per dokumen dan maksimal lima kutipan keseluruhan pada mode tanya-jawab.
3. Pastikan satu dokumen tidak mendominasi semua bukti ketika dokumen lain juga memiliki kutipan relevan.
4. Ulangi dengan pertanyaan yang hanya terjawab oleh satu dokumen. Sistem tidak boleh memaksakan kutipan dari dokumen lain yang tidak relevan dan tetap boleh memakai hingga lima kutipan dari satu file.
5. Uji ketentuan yang tampak bertentangan tetapi berasal dari tanggal, periode berlaku, kelompok sasaran, atau ruang lingkup berbeda. Jawaban harus membedakan perbedaan konteks dari pertentangan sesungguhnya.
6. Periksa setiap klaim faktual dengan penanda [S#], nama dokumen, halaman/bagian, dan kutipan sumber. Jangan menerima kesimpulan yang tidak didukung kutipan terpilih.

**Batasan:** batas bukti per dokumen adalah strategi pemilihan kutipan, bukan penilaian bahwa setiap dokumen memiliki otoritas yang sama. Kualitas sintesis dan interpretasi perbedaan tetap perlu diperiksa manusia terhadap dokumen asli.

## 12. Tabel lintas halaman dan header berulang

1. Siapkan PDF uji dengan tabel yang dimulai di bagian bawah halaman pertama dan berlanjut di halaman berikutnya. Gunakan contoh aman, bukan data pribadi.
2. Buat variasi pertama dengan header kolom yang diulang pada halaman lanjutan. Pastikan halaman kedua menampilkan keterangan **Header tabel berulang dari halaman N** dan halaman sumber tetap benar.
3. Buat variasi kedua tanpa header berulang, tetapi dengan jumlah kolom dan posisi kolom yang konsisten. Sistem hanya boleh menampilkan **Kemungkinan lanjutan tabel halaman N**, bukan menyatakan kesinambungan sebagai fakta.
4. Uji tabel yang berbeda pada halaman berikutnya dengan posisi kolom yang mirip. Periksa apakah penandaan kemungkinan lanjutan masih masuk akal; jangan menganggap kecocokan geometris membuktikan tabel yang sama.
5. Uji halaman yang tidak berurutan, tabel yang tidak mencapai bagian bawah halaman sebelumnya, dan tabel yang tidak dimulai di bagian atas halaman berikutnya. Sistem tidak boleh menghubungkannya sebagai kelanjutan.
6. Pastikan header berulang tidak ditafsirkan model sebagai data tambahan dan nilai pada setiap halaman tetap dapat ditelusuri ke sitasi [S#] yang benar.
7. Bandingkan hasil ekstraksi dengan PDF asli, terutama untuk kolom yang memiliki sel gabungan, baris multiline, atau pemisah vertikal yang rapat.

**Batasan:** hubungan lintas halaman menggunakan urutan halaman, posisi awal/akhir blok, kesamaan header, jumlah kolom, dan perkiraan posisi kolom. Header sama pada dua halaman berurutan menjadi indikasi kuat pengulangan; kesamaan geometri tanpa header hanya menghasilkan label kemungkinan. Sistem belum membuktikan identitas tabel melalui border, merged cells, header bertingkat, atau makna semantik kolom.

## 13. Verifikasi sitasi pada tingkat klaim

1. Muat dokumen uji yang memiliki kutipan teks jelas, lalu jalankan pertanyaan yang menghasilkan beberapa kalimat faktual.
2. Periksa setiap kalimat yang ditampilkan: klaim dengan penanda [S#] dan istilah yang cocok kuat dengan kutipan akan diberi status **didukung secara tekstual**. Status ini bukan jaminan kebenaran makna.
3. Uji klaim yang hanya memiliki sebagian istilah sama dengan bukti. Status seharusnya **dukungan parsial** dan panel meminta pemeriksaan manusia.
4. Uji kalimat dengan sitasi valid tetapi isi yang tidak memiliki kecocokan istilah memadai. Status harus **dukungan lemah**, bukan otomatis dianggap benar hanya karena [S#] tersedia.
5. Uji jawaban dengan satu kalimat faktual tanpa sitasi. Pastikan status **tanpa sitasi** ditampilkan.
6. Uji model/hasil jawaban yang menyebut [S9] ketika hanya ada dua kutipan. Pastikan rujukan tersebut ditandai **tidak valid** dan tidak diperlakukan sebagai sumber.
7. Uji beberapa kalimat sekaligus: satu didukung, satu tidak disitasi, dan satu parsial. Pastikan panel memeriksa masing-masing klaim, bukan hanya keberadaan satu penanda [S#] di seluruh jawaban.
8. Uji klaim sangat singkat atau judul pendek. Sistem seharusnya menyatakan tidak cukup teks untuk dinilai, bukan menganggapnya didukung.
9. Buka kutipan di bawah jawaban dan verifikasi ulang nama dokumen, halaman/bagian, angka, satuan, tanggal, pengecualian, serta konteks kalimat.

**Batasan penting:** pemeriksaan otomatis membandingkan istilah pada kalimat dengan teks kutipan yang benar-benar diberikan ke model. Pemeriksaan ini tidak memahami negasi, sinonim, implikasi, hubungan sebab-akibat, konteks hukum, atau kontradiksi semantik secara andal. Skor kecocokan tinggi bukan bukti entailment dan tidak menggantikan pemeriksaan manusia terhadap dokumen asli.


## 14. Angka, tanggal, satuan, dan konteks klaim

1. Gunakan dokumen uji tanpa data pribadi yang menyebut nilai, persentase, jumlah, satuan, tanggal, dan periode secara eksplisit.
2. Buat klaim dengan nilai yang sama tetapi format Indonesia berbeda, misalnya "Rp 1.500.000" dibanding "Rp 1500000" atau tanggal "1 September 2026" dibanding "01/09/2026". Periksa bahwa format setara tidak otomatis ditandai sebagai perbedaan.
3. Buat klaim dengan angka yang tidak muncul pada kutipan. Panel harus menampilkan peringatan **Angka/nilai tidak ditemukan**, tanpa menyimpulkan bahwa klaim pasti salah.
4. Gunakan angka sama dengan satuan berbeda, misalnya "10 kg" dan "10 gram". Panel harus memberi peringatan **Satuan perlu diperiksa**.
5. Gunakan tanggal/periode yang tidak tercantum pada kutipan. Panel harus menampilkan **Tanggal/periode tidak ditemukan**. Tahun yang terlihat pada dokumen lain tetapi tidak berada dalam kutipan terpilih tidak boleh dianggap sebagai bukti.
6. Bandingkan kalimat yang berbeda pada penanda **tidak/bukan/belum**, **wajib/harus/boleh**, **kecuali/hanya/seluruh**, serta **semester/tahun ajaran/kelas/wilayah**. Perbedaan penanda harus meminta pemeriksaan konteks, bukan menyatakan kontradiksi secara otomatis.
7. Buka kutipan sumber dan cocokkan angka, tanda desimal, mata uang, satuan, tanggal, periode, subjek, pengecualian, dan ruang lingkup dengan dokumen asli.

**Batasan:** normalisasi angka menggunakan aturan format umum dan dapat ambigu pada dokumen dengan locale campuran. Daftar satuan serta penanda konteks tidak lengkap. Perbandingan tanggal bergantung pada format yang dikenali. Nilai yang sama dapat muncul dalam konteks berbeda, sedangkan sinonim dan parafrasa dapat luput. Semua peringatan harus diperlakukan sebagai petunjuk pemeriksaan, bukan penentu kebenaran atau kontradiksi.


## 15. Konflik nilai antar-sumber

1. Siapkan dua dokumen uji yang membahas konsep sama dengan satuan yang sama, misalnya jumlah peserta didik aktif. Gunakan nilai berbeda tanpa periode yang berbeda. Pastikan panel menandai **Potensi konflik nilai** dan menampilkan kedua kutipan serta identitas [S#].
2. Ulangi dengan nilai berbeda tetapi tahun yang eksplisit berbeda. Sistem harus menandai **Perbedaan periode/cakupan**, bukan menyatakan konflik langsung.
3. Uji konsep yang tidak berhubungan, misalnya jumlah peserta didik dibanding nilai anggaran. Sistem tidak boleh membandingkan keduanya hanya karena sama-sama mengandung angka.
4. Uji angka yang sama dengan satuan berbeda, misalnya berat 10 kg dan 10 gram. Sistem harus menampilkan **Perbedaan satuan** secara terpisah.
5. Periksa apakah sumber berasal dari halaman berbeda dalam dokumen yang sama atau dari beberapa dokumen. Identitas dokumen, halaman/bagian, dan kedua cuplikan harus tetap sesuai.
6. Uji halaman tabel dengan banyak baris, angka tahun, nomor halaman, dan beberapa metrik. Pastikan angka yang tidak memiliki satuan atau konteks bersama yang cukup tidak memicu perbandingan yang menyesatkan.
7. Periksa dokumen asli sebelum menyimpulkan konflik. Cermati periode, populasi, definisi, status data, metode pengukuran, versi dokumen, dan satuan.

**Batasan:** pendeteksi menggunakan kesamaan istilah konteks dan angka bersatuan sebagai sinyal awal. Ia belum memahami kesetaraan makna, relasi tabel, identitas subjek per baris, atau otoritas versi dokumen. Kutipan yang dipilih juga bukan keseluruhan koleksi. Label **Potensi konflik** berarti perlu pemeriksaan manusia, bukan bukti bahwa sumber saling membantah atau salah.
