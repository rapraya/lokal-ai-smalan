(() => {
  "use strict";

  const workspace = document.getElementById("workspaceContent");
  const breadcrumb = document.getElementById("breadcrumbCurrent");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuToggle = document.getElementById("menuToggle");
  const searchInput = document.getElementById("workspaceSearch");
  const overviewMarkup = workspace.innerHTML;
  let currentPage = "home";

  const icon = (name) => '<svg aria-hidden="true"><use href="#i-' + name + '"></use></svg>';

  const modules = {
    chat: {
      title: "AI Chat", label: "CONVERSATIONAL INTELLIGENCE", icon: "message", color: "icon-blue",
      description: "Ruang percakapan untuk berdiskusi, bertanya, mengeksplorasi ide, menyusun rencana, dan bekerja bersama model bahasa.",
      headline: "Percakapan yang membuka kemungkinan.",
      detail: "Fondasi percakapan lokal direncanakan menggunakan WebLLM dan WebGPU. Model perlu diunduh terlebih dahulu, dan kompatibilitas bergantung pada browser, GPU, serta kapasitas memori perangkat.",
      stages: [["Model runtime", "Memilih model bahasa yang kompatibel dan mengelola proses pemuatannya."], ["Streaming chat", "Jawaban bertahap, riwayat percakapan, dan pengaturan respons."], ["Knowledge workspace", "Konteks dokumen dan sumber referensi dengan kontrol pengguna."]]
    },
    coding: {
      title: "AI Coding", label: "DEVELOPER INTELLIGENCE", icon: "code", color: "icon-violet",
      description: "Workspace pengembangan untuk membantu menulis, memahami, meninjau, dan memperbaiki kode.",
      headline: "Dari ide menjadi kode yang bekerja.",
      detail: "AI Coding akan menggunakan model bahasa yang sesuai untuk tugas pemrograman. Editor, pembacaan berkas, terminal, serta perubahan kode memerlukan sandbox dan persetujuan eksplisit sebelum dijalankan.",
      stages: [["Code assistant", "Penjelasan kode, debugging, refactoring, dan dokumentasi."], ["Editor & project context", "Editor dengan syntax highlighting dan konteks berkas terpilih."], ["Safe execution", "Pengujian terisolasi dan review perubahan sebelum diterapkan."]]
    },
    image: {
      title: "Image Studio", label: "GENERATIVE VISUALS", icon: "image", color: "icon-rose",
      description: "Ruang kreatif untuk membuat konsep visual, memahami gambar, mengedit, dan menyiapkan aset desain.",
      headline: "Visualisasikan ide tanpa batas.",
      detail: "Analisis gambar dan beberapa tugas computer vision dapat dijalankan lokal dengan model kompatibel. Generasi gambar dari teks memerlukan runtime/model khusus; itu tidak otomatis tersedia hanya dengan memasang Transformers.js.",
      stages: [["Image understanding", "Deskripsi gambar, klasifikasi, deteksi objek, dan pemrosesan visual."], ["Image creation", "Evaluasi model generatif dan kebutuhan GPU, memori, serta ruang penyimpanan."], ["Editing workspace", "Crop, resize, remove background, variasi, dan ekspor aset."]]
    },
    audio: {
      title: "Audio Lab", label: "SPEECH & SOUND", icon: "audio", color: "icon-mint",
      description: "Kelola audio, ubah suara menjadi teks, buat suara dari teks, dan pahami konten percakapan.",
      headline: "Suara menjadi pengalaman yang lebih cerdas.",
      detail: "Pengenalan ucapan dan text-to-speech memiliki dukungan model di Transformers.js. Kualitas bahasa, ukuran model, latensi, dan kemampuan pemrosesan offline harus diuji untuk setiap model.",
      stages: [["Speech to text", "Transkripsi audio dan penanganan bahasa yang didukung model."], ["Text to speech", "Membacakan teks dengan suara sintetis yang kompatibel."], ["Audio intelligence", "Klasifikasi, ringkasan, dan alur pengolahan audio lanjutan."]]
    },
    video: {
      title: "Video Studio", label: "MOTION & STORYTELLING", icon: "video", color: "icon-orange",
      description: "Rancang cerita, olah klip, pahami isi video, dan siapkan konten visual bergerak.",
      headline: "Cerita bergerak dari satu ide.",
      detail: "Pemrosesan klip di browser dapat memanfaatkan API media, tetapi generasi video dengan AI membutuhkan model dan runtime khusus dengan tuntutan komputasi yang jauh lebih besar. Layanan eksternal hanya akan menjadi opsi yang dinyatakan secara terbuka.",
      stages: [["Video understanding", "Metadata, pemotongan klip, ekstraksi frame, dan transkripsi."], ["Video editing", "Alur penyuntingan berbasis browser dan ekspor hasil."], ["AI video generation", "Riset model, estimasi resource, dan evaluasi opsi lokal maupun eksternal."]]
    },
    text: {
      title: "Text & Language", label: "LANGUAGE & KNOWLEDGE", icon: "type", color: "icon-sky",
      description: "Bantu menulis, merangkum, menerjemahkan, menyunting, dan memahami dokumen maupun bahasa.",
      headline: "Kata-kata yang lebih tajam. Gagasan yang lebih jelas.",
      detail: "Tugas seperti ringkasan, klasifikasi, ekstraksi informasi, dan terjemahan dapat menggunakan model yang sesuai dari ekosistem Transformers.js atau LLM lokal.",
      stages: [["Writing assistant", "Draft, penyuntingan, perbaikan gaya, dan pemeriksaan struktur."], ["Language tools", "Ringkasan, terjemahan, klasifikasi, dan ekstraksi informasi."], ["Document intelligence", "Pemrosesan teks dan dokumen dengan sumber yang bisa ditelusuri."]]
    },
    data: {
      title: "Data Analyst", label: "DATA & DECISIONS", icon: "chart", color: "icon-gold",
      description: "Ubah data menjadi pemahaman melalui eksplorasi, statistik, visualisasi, dan dukungan pengambilan keputusan.",
      headline: "Temukan cerita di balik data.",
      detail: "Perhitungan statistik dan visualisasi sebaiknya dilakukan oleh kode analitik yang deterministik. AI membantu menjelaskan temuan, menyusun hipotesis, dan membandingkan skenario—bukan menggantikan validasi data.",
      stages: [["Data workspace", "Impor CSV dan format tabel dengan pemeriksaan kualitas data."], ["Analysis & visualization", "Statistik deskriptif, tren, distribusi, dan grafik."], ["Decision support", "Skenario, asumsi, risiko, serta ringkasan yang dapat diverifikasi."]]
    },
    assistant: {
      title: "AI Assistant", label: "AI AGENT & WORKFLOWS", icon: "spark", color: "icon-cyan",
      description: "Asisten virtual untuk membantu merencanakan tugas, menata pekerjaan, dan menjalankan workflow yang diizinkan.",
      headline: "Asisten yang membantu pekerjaan bergerak.",
      detail: "Fitur agent akan memakai daftar tindakan yang diizinkan, menampilkan rencana sebelum bertindak, dan meminta persetujuan untuk aktivitas penting. Tidak ada akses perangkat atau akun secara diam-diam.",
      stages: [["Task planning", "Pecah pekerjaan menjadi langkah yang jelas dan terukur."], ["Approved tools", "Integrasi alat dengan izin minimum dan konfirmasi pengguna."], ["Workflow history", "Catatan tindakan, hasil, dan kontrol untuk membatalkan bila memungkinkan."]]
    },
    personal: {
      title: "Personal AI", label: "PERSONAL INTELLIGENCE", icon: "user", color: "icon-violet",
      description: "Pengalaman yang menyesuaikan preferensi, kebiasaan kerja, dan rekomendasi berdasarkan pilihan pengguna.",
      headline: "Lebih relevan, tetap dalam kendalimu.",
      detail: "Personalisasi direncanakan berbasis preferensi yang terlihat dan dapat dihapus. Memori lokal, riwayat, serta rekomendasi tidak akan dibuat tanpa kontrol dan penjelasan yang jelas.",
      stages: [["Preferences", "Atur gaya respons, bahasa, tema, dan preferensi workspace."], ["Local memory", "Simpan konteks yang dipilih pengguna dalam penyimpanan browser."], ["Recommendations", "Saran yang menjelaskan alasan dan dapat disesuaikan atau dimatikan."]]
    },
    navigation: {
      title: "AI Navigator", label: "NAVIGATION & MOBILITY", icon: "compass", color: "icon-green",
      description: "Bantu merencanakan perjalanan, memahami lokasi, membandingkan rute, dan mendukung mobilitas.",
      headline: "Bergerak lebih terarah.",
      detail: "Navigasi dapat memerlukan izin lokasi, data peta, dan layanan rute. Lokasi tidak akan dibaca atau dikirim tanpa persetujuan; penggunaan penyedia peta eksternal akan dijelaskan.",
      stages: [["Trip planning", "Susun tujuan, titik singgah, dan kebutuhan perjalanan."], ["Maps & routes", "Peta, estimasi rute, serta pilihan moda dengan sumber data yang jelas."], ["Context-aware mobility", "Rekomendasi perjalanan sesuai preferensi dan izin pengguna."]]
    }
  };

  const pages = {
    models: {
      title: "Model Engine", label: "ON-DEVICE MODEL RUNTIME", icon: "cpu", color: "icon-blue",
      description: "Pusat pemeriksaan kompatibilitas perangkat, pengelolaan runtime, model, unduhan, dan penyimpanan lokal.",
      headline: "Pahami kemampuan perangkat sebelum menjalankan model.",
      detail: "Pemeriksaan awal di halaman ini hanya membaca dukungan browser dan WebGPU. Itu belum menjamin model tertentu dapat berjalan; kapasitas memori, driver, ukuran model, dan konfigurasi runtime tetap menentukan.",
      stages: [["Device diagnostics", "Status secure context, WebGPU adapter, browser, dan informasi perangkat yang tersedia."], ["Model catalog", "Daftar model dengan ukuran, tugas, lisensi, bahasa, dan kebutuhan resource."], ["Storage & lifecycle", "Progress unduhan, cache, penghapusan model, serta pengelolaan ruang."]]
    },
    settings: {
      title: "Pengaturan", label: "WORKSPACE PREFERENCES", icon: "settings", color: "icon-sky",
      description: "Kelola tampilan, bahasa, preferensi penyimpanan, privasi, dan perilaku workspace.",
      headline: "Workspace yang terasa milikmu.",
      detail: "Pengaturan tema saat ini sudah aktif dan disimpan di browser. Kontrol privasi dan pengelolaan data akan ditambahkan sebelum fitur AI menyimpan riwayat atau memori.",
      stages: [["Appearance", "Pilih tema terang atau gelap untuk workspace."], ["Privacy controls", "Kelola riwayat, memori, izin, dan pilihan pemrosesan lokal."], ["Data management", "Ekspor atau hapus data lokal dengan tindakan yang jelas."]]
    }
  };

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  }

  function updateNavigation(page) {
    document.querySelectorAll(".nav-link").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });
    const active = document.querySelector('.nav-link[data-page="' + page + '"]');
    if (active) active.setAttribute("aria-current", "page");
    document.querySelectorAll(".nav-link:not(.active)").forEach((item) => item.removeAttribute("aria-current"));
  }

  function renderOverview() {
    workspace.innerHTML = overviewMarkup;
    const date = document.getElementById("todayLabel");
    if (date) {
      date.textContent = new Intl.DateTimeFormat("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      }).format(new Date());
    }
    checkDevice();
    filterCapabilities(searchInput.value);
  }

  function renderModule(page) {
    const config = modules[page] || pages[page];
    if (!config) return;
    const steps = config.stages.map((stage, index) =>
      '<li><span class="roadmap-index">' + String(index + 1).padStart(2, "0") + '</span><div><b>' + stage[0] + '</b><small>' + stage[1] + '</small></div></li>'
    ).join("");
    workspace.innerHTML = `
      <div class="module-page">
        <button class="module-back" data-page="home">${icon("arrow")} Kembali ke overview</button>
        <div class="module-heading-row">
          <span class="module-heading-icon ${config.color}">${icon(config.icon)}</span>
          <div><div class="eyebrow"><span class="eyebrow-pulse"></span> ${config.label}</div><h1>${config.title}</h1><p>${config.description}</p></div>
        </div>
        <div class="module-stage">
          <section class="stage-card">
            <span class="stage-tag"><i></i> Rencana implementasi</span>
            <h2>${config.headline}</h2>
            <p>${config.detail}</p>
            <div class="stage-note">${icon("shield")} <span>Workspace ini sedang dibangun bertahap. Kartu ini menjelaskan arah fitur; belum ada inferensi atau pemrosesan AI yang dijalankan pada halaman ini.</span></div>
          </section>
          <aside class="stage-side-card"><h3>Ruang lingkup pengembangan</h3><ol class="roadmap-list">${steps}</ol></aside>
        </div>
        <div class="module-privacy">${icon("lock")}<p><strong>Transparansi pemrosesan.</strong> Model lokal, penyimpanan browser, dan layanan eksternal akan dibedakan dengan jelas. Fitur yang mengirim data ke layanan lain harus meminta pilihan pengguna terlebih dahulu.</p></div>
        ${page === "models" ? renderEngineMetrics() : ""}
        ${page === "settings" ? renderSettingsPanel() : ""}
        <footer class="main-footer"><span>© 2026 LOKAL AI <b>·</b> SMALAN</span><span>Designed for ideas without limits.</span></footer>
      </div>`;
    if (page === "models") checkDevice();
  }

  function renderEngineMetrics() {
    return '<div class="engine-metrics"><div class="engine-metric"><span>Browser GPU</span><strong id="engineGpu">Memeriksa…</strong></div><div class="engine-metric"><span>Secure context</span><strong id="engineSecure">Memeriksa…</strong></div><div class="engine-metric"><span>AI runtime</span><strong>Belum terhubung</strong></div></div>';
  }

  function renderSettingsPanel() {
    const theme = document.body.dataset.theme === "light" ? "Terang" : "Gelap";
    return '<div class="stage-side-card" style="margin-top:13px"><h3>Preferensi workspace</h3><div class="settings-row"><span>Tema saat ini</span><strong id="themeSetting">' + theme + '</strong></div><div class="settings-row"><span>Penyimpanan lokal</span><strong>Preferensi tema saja</strong></div><div class="settings-row"><span>Riwayat AI</span><strong>Belum diaktifkan</strong></div></div>';
  }

  function checkDevice() {
    const webgpuTargets = ["webgpuStatus", "engineGpu"];
    const secureTargets = ["secureStatus", "engineSecure"];
    const setText = (ids, value) => ids.forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    });

    setText(secureTargets, window.isSecureContext ? "Aman (HTTPS)" : "Butuh HTTPS");
    if (!("gpu" in navigator) || !navigator.gpu) {
      setText(webgpuTargets, "Tidak terdeteksi");
      return;
    }
    if (!window.isSecureContext) {
      setText(webgpuTargets, "Butuh secure context");
      return;
    }
    navigator.gpu.requestAdapter().then((adapter) => {
      setText(webgpuTargets, adapter ? "Adapter tersedia" : "Adapter tidak tersedia");
    }).catch(() => setText(webgpuTargets, "Tidak dapat diperiksa"));
  }

  function filterCapabilities(term) {
    const grid = document.getElementById("capabilityGrid");
    if (!grid) return;
    const query = term.trim().toLocaleLowerCase("id-ID");
    let visible = 0;
    grid.querySelectorAll(".capability-card").forEach((card) => {
      const haystack = (card.dataset.search + " " + card.textContent).toLocaleLowerCase("id-ID");
      const match = !query || haystack.includes(query);
      card.hidden = !match;
      if (match) visible += 1;
    });
    const empty = document.getElementById("searchEmpty");
    if (empty) empty.hidden = visible > 0;
    const count = document.querySelector(".module-counter");
    if (count) count.innerHTML = query ? "<strong>" + visible + "</strong> hasil pencarian" : "<strong>10</strong> AI capabilities";
  }

  function renderPage(page, updateHash = true) {
    const selected = page === "home" ? "home" : (modules[page] || pages[page] ? page : "home");
    currentPage = selected;
    breadcrumb.textContent = selected === "home" ? "Overview" : (modules[selected] || pages[selected]).title;
    updateNavigation(selected);
    if (selected === "home") renderOverview();
    else renderModule(selected);
    if (updateHash) {
      const nextHash = selected === "home" ? "#home" : "#" + selected;
      if (window.location.hash !== nextHash) history.replaceState(null, "", nextHash);
    }
    closeSidebar();
  }

  document.addEventListener("click", (event) => {
    const pageTrigger = event.target.closest("[data-page]");
    if (pageTrigger) {
      event.preventDefault();
      renderPage(pageTrigger.dataset.page);
      return;
    }
    const scrollTrigger = event.target.closest("[data-scroll]");
    if (scrollTrigger) {
      const target = document.getElementById(scrollTrigger.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("show");
    });
  }
  overlay.addEventListener("click", closeSidebar);

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (searchInput.value.trim() && currentPage !== "home") renderPage("home");
      filterCapabilities(searchInput.value);
    });
  }

  const themeToggle = document.getElementById("themeToggle");
  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    try { localStorage.setItem("lokal-ai-theme", theme); } catch (_) {}
    const themeIcon = document.querySelector("#themeIcon use");
    if (themeIcon) themeIcon.setAttribute("href", theme === "light" ? "#i-moon" : "#i-sun");
    const setting = document.getElementById("themeSetting");
    if (setting) setting.textContent = theme === "light" ? "Terang" : "Gelap";
  }
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem("lokal-ai-theme") || "dark"; } catch (_) {}
  applyTheme(savedTheme === "light" ? "light" : "dark");
  themeToggle.addEventListener("click", () => {
    applyTheme(document.body.dataset.theme === "light" ? "dark" : "light");
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === "Escape") {
      closeSidebar();
      if (document.activeElement === searchInput) searchInput.blur();
    }
  });

  window.addEventListener("hashchange", () => {
    const requested = window.location.hash.slice(1) || "home";
    if (requested !== currentPage) renderPage(requested, false);
  });

  const initialPage = window.location.hash.slice(1);
  renderPage(initialPage || "home", false);
})();