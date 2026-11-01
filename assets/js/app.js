(() => {
  "use strict";

  const pageContent = document.getElementById("pageContent");
  const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const menuToggle = document.getElementById("menuToggle");

  const pages = {
    home: { title: "Beranda" },
    chat: {
      title: "AI Chat",
      eyebrow: "CONVERSATIONAL AI",
      heading: "AI Chat",
      description: "Ruang percakapan dengan model bahasa yang dapat dijalankan secara lokal di browser yang kompatibel.",
      detail: "Integrasi model bahasa, sesi percakapan, streaming jawaban, dan penyimpanan riwayat akan dibangun pada tahap berikutnya."
    },
    vision: {
      title: "AI Vision",
      eyebrow: "IMAGE & DOCUMENT INTELLIGENCE",
      heading: "AI Vision",
      description: "Bantu memahami gambar dan dokumen dengan model visi komputer yang kompatibel.",
      detail: "Unggah gambar, analisis visual, dan dukungan pemahaman dokumen akan ditambahkan setelah evaluasi model dan batasan perangkat."
    },
    coding: {
      title: "AI Coding",
      eyebrow: "DEVELOPER WORKSPACE",
      heading: "AI Coding",
      description: "Ruang bantu pemrograman untuk menjelaskan kode, meninjau struktur, dan membantu proses debugging.",
      detail: "Editor kode, konteks percakapan, dan integrasi model coding lokal akan dikembangkan pada tahap lanjutan."
    },
    models: {
      title: "Model Engine",
      eyebrow: "ON-DEVICE MODEL RUNTIME",
      heading: "Model Engine",
      description: "Kelola kemampuan perangkat dan model AI yang akan dijalankan langsung di browser.",
      detail: "Pemeriksaan WebGPU awal tersedia di halaman ini. Pemilihan model, unduhan, cache lokal, dan pengelolaan kapasitas akan diimplementasikan secara bertahap."
    },
    settings: {
      title: "Pengaturan",
      eyebrow: "WORKSPACE PREFERENCES",
      heading: "Pengaturan",
      description: "Atur preferensi workspace, tampilan, dan informasi privasi.",
      detail: "Pengaturan tema, preferensi penyimpanan, dan kontrol privasi akan ditambahkan seiring tersedianya fitur inti."
    }
  };

  function closeSidebar() {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
  }

  function renderPage(page) {
    const config = pages[page] || pages.home;
    breadcrumbCurrent.textContent = config.title;
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    if (page === "home") {
      window.location.hash = "";
      window.location.reload();
      return;
    }

    window.location.hash = page;
    pageContent.innerHTML = `
      <div class="module-page">
        <div class="eyebrow"><span class="eyebrow-line"></span> ${config.eyebrow}</div>
        <h1>${config.heading}</h1>
        <p>${config.description}</p>
        <div class="module-placeholder">
          <strong>Workspace sedang disiapkan</strong>
          <span>${config.detail}</span>
          <br><button class="primary-button" type="button" data-page="models">Buka Model Engine <span>↗</span></button>
        </div>
      </div>
      <footer class="main-footer"><span>LOKAL AI <b>·</b> SMALAN</span><span>Built with privacy in mind.</span></footer>
    `;
    closeSidebar();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-page]");
    if (!trigger) return;
    event.preventDefault();
    renderPage(trigger.dataset.page);
  });

  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    backdrop.classList.toggle("show");
  });
  backdrop.addEventListener("click", closeSidebar);

  const webgpuStatus = document.getElementById("webgpuStatus");
  if (webgpuStatus) {
    const supported = typeof navigator !== "undefined" && "gpu" in navigator;
    webgpuStatus.textContent = supported ? "Tersedia · perlu diuji" : "Tidak terdeteksi";
  }

  const browserStatus = document.getElementById("browserStatus");
  if (browserStatus && navigator.userAgent) {
    browserStatus.textContent = "Browser terdeteksi";
  }

  const todayLabel = document.getElementById("todayLabel");
  if (todayLabel) {
    todayLabel.textContent = new Intl.DateTimeFormat("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(new Date());
  }

  const initialPage = window.location.hash.replace("#", "");
  if (initialPage && pages[initialPage] && initialPage !== "home") {
    renderPage(initialPage);
  }
})();
