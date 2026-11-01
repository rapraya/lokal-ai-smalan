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

  const chatHistoryKey = "lokal-ai-chat-history";
  const chatSavePreferenceKey = "lokal-ai-chat-save";
  const chatSystemMessage = {
    role: "system",
    content: "Kamu adalah Lokal AI, asisten yang membantu dalam bahasa Indonesia. Jawab dengan jelas, akurat, dan terstruktur. Jika tidak yakin, nyatakan keterbatasan. Jangan mengarang fakta atau sumber."
  };
  let chatMessages = [chatSystemMessage];
  let chatEngine = null;
  let chatWorker = null;
  let chatModelId = "";
  let chatLoading = false;
  let chatGenerating = false;
  let chatHistoryRestored = false;
  let chatLastError = "";


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

    if (page === "chat") {
      workspace.innerHTML = renderChatWorkspace();
      bindChatWorkspace();
      return;
    }
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


  function restoreChatHistory() {
    if (chatHistoryRestored) return;
    chatHistoryRestored = true;
    try {
      if (localStorage.getItem(chatSavePreferenceKey) !== "1") return;
      const stored = JSON.parse(localStorage.getItem(chatHistoryKey) || "[]");
      if (!Array.isArray(stored)) return;
      const valid = stored.filter((item) =>
        item && (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
      ).slice(-80);
      chatMessages = [chatSystemMessage, ...valid];
    } catch (_) {
      chatMessages = [chatSystemMessage];
    }
  }

  function renderChatWorkspace() {
    restoreChatHistory();
    return '<div class="chat-page">' +
      '<div class="module-back-row"><button class="module-back" data-page="home">' + icon("arrow") + ' Kembali ke overview</button><span class="chat-private-label">' + icon("lock") + ' Percakapan diproses di perangkat</span></div>' +
      '<div class="chat-page-heading"><div><div class="eyebrow"><span class="eyebrow-pulse"></span> CONVERSATIONAL INTELLIGENCE</div><h1>AI Chat</h1><p>Mulai percakapan dengan model bahasa yang berjalan langsung di browser.</p></div><span class="chat-build-status"><i></i> Local runtime</span></div>' +
      '<div class="chat-layout">' +
        '<aside class="chat-control-panel">' +
          '<div class="chat-panel-label">MODEL ENGINE</div>' +
          '<div class="chat-engine-title"><span>' + icon("cpu") + '</span><div><b>Local language model</b><small>WebLLM · WebGPU</small></div></div>' +
          '<label class="chat-field-label" for="chatModelSelect">Pilih model</label>' +
          '<select class="chat-model-select" id="chatModelSelect">' +
            '<option value="Llama-3.2-1B-Instruct-q4f16_1-MLC" data-vram="879.04">Llama 3.2 · 1B · 4-bit</option>' +
            '<option value="Llama-3.2-3B-Instruct-q4f16_1-MLC" data-vram="2263.69">Llama 3.2 · 3B · 4-bit</option>' +
          '</select>' +
          '<div class="chat-model-hint" id="chatModelHint">Estimasi VRAM manifest: ±879 MB. Model ringan untuk uji awal; kualitas Bahasa Indonesia tetap perlu dievaluasi.</div>' +
          '<button class="chat-load-button" id="chatLoadButton" type="button">Muat model lokal ' + icon("arrow") + '</button>' +
          '<button class="chat-unload-button" id="chatUnloadButton" type="button" hidden>Lepaskan model</button>' +
          '<div class="chat-progress" id="chatProgress" hidden><div class="chat-progress-track"><span id="chatProgressBar"></span></div><p id="chatProgressText">Menyiapkan runtime…</p></div>' +
          '<div class="chat-engine-status" id="chatEngineStatus"><span class="status-idle"></span><span>Model belum aktif</span></div>' +
          '<div class="chat-panel-divider"></div>' +
          '<div class="chat-panel-label">PRIVACY CONTROLS</div>' +
          '<label class="chat-save-option"><input id="chatSaveHistory" type="checkbox"><span><b>Simpan riwayat lokal</b><small>Opsional. Disimpan di browser ini dan dapat dihapus.</small></span></label>' +
          '<button class="chat-clear-button" id="chatClearButton" type="button">Hapus riwayat percakapan</button>' +
          '<div class="chat-local-note">' + icon("shield") + '<p>Prompt dan jawaban diproses oleh model lokal setelah model termuat. Unduhan runtime dan model tetap membutuhkan koneksi internet.</p></div>' +
        '</aside>' +
        '<section class="chat-conversation">' +
          '<div class="chat-conversation-top"><div><b>Private session</b><small id="chatConversationModel">Belum ada model aktif</small></div><span class="chat-session-indicator"><i></i> LOCAL SESSION</span></div>' +
          '<div class="chat-messages" id="chatMessages" aria-live="polite"></div>' +
          '<form class="chat-composer" id="chatComposer">' +
            '<textarea id="chatInput" rows="2" maxlength="8000" placeholder="Muat model lokal untuk mulai bertanya…" disabled></textarea>' +
            '<div class="chat-composer-bottom"><span>Enter untuk baris baru · Ctrl + Enter untuk kirim</span><button id="chatSendButton" type="submit" disabled>Kirim ' + icon("arrow-up") + '</button></div>' +
          '</form>' +
        '</section>' +
      '</div>' +
      '<div class="chat-footer-note">Model: Llama 3.2 Instruct · WebLLM 0.2.87 · Model file disediakan melalui Hugging Face/MLC. Perkiraan VRAM bukan jaminan kompatibilitas.</div>' +
      '<footer class="main-footer"><span>© 2026 LOKAL AI <b>·</b> SMALAN</span><span>Local-first by design.</span></footer>' +
    '</div>';
  }

  function setChatStatus(message, state = "idle") {
    const status = document.getElementById("chatEngineStatus");
    if (status) {
      status.innerHTML = '<span class="status-' + state + '"></span><span></span>';
      status.lastElementChild.textContent = message;
    }
    const conversationModel = document.getElementById("chatConversationModel");
    if (conversationModel) conversationModel.textContent = chatEngine ? chatModelId : "Belum ada model aktif";
  }

  function updateChatProgress(progress) {
    const panel = document.getElementById("chatProgress");
    const bar = document.getElementById("chatProgressBar");
    const label = document.getElementById("chatProgressText");
    if (!panel || !bar || !label) return;
    panel.hidden = false;
    const ratio = Number(progress && progress.progress);
    const percent = Number.isFinite(ratio) ? Math.max(0, Math.min(100, Math.round(ratio * 100))) : 0;
    bar.style.width = percent + "%";
    label.textContent = (progress && progress.text) || "Mengunduh dan menyiapkan model lokal…";
  }

  function paintChatMessages() {
    const host = document.getElementById("chatMessages");
    if (!host) return;
    host.replaceChildren();
    const visibleMessages = chatMessages.filter((message) => message.role === "user" || message.role === "assistant");
    if (!visibleMessages.length) {
      host.innerHTML = '<div class="chat-welcome"><div class="chat-welcome-mark">✳</div><span class="section-kicker">YOUR PRIVATE AI ASSISTANT</span><h2>Apa yang ingin kamu eksplorasi?</h2><p>Mulai dengan pertanyaan, ide, atau pekerjaan yang ingin kamu pecahkan.</p><div class="chat-prompt-grid"><button type="button" data-chat-prompt="Jelaskan konsep kecerdasan buatan dengan contoh sederhana.">Jelaskan sebuah konsep</button><button type="button" data-chat-prompt="Bantu saya menyusun rencana kerja yang terstruktur.">Susun rencana kerja</button><button type="button" data-chat-prompt="Bantu saya memahami dan memperbaiki kode berikut:">Bantu memahami kode</button></div></div>';
      return;
    }
    visibleMessages.forEach((message) => {
      const item = document.createElement("article");
      item.className = "chat-message " + (message.role === "user" ? "chat-message-user" : "chat-message-assistant");
      const avatar = document.createElement("span");
      avatar.className = "chat-message-avatar";
      avatar.textContent = message.role === "user" ? "S" : "✳";
      const body = document.createElement("div");
      body.className = "chat-message-body";
      const title = document.createElement("b");
      title.textContent = message.role === "user" ? "Kamu" : "Lokal AI";
      const text = document.createElement("div");
      text.className = "chat-message-text";
      text.textContent = message.content;
      body.append(title, text);
      item.append(avatar, body);
      host.append(item);
    });
    host.scrollTop = host.scrollHeight;
  }

  function saveChatHistory() {
    try {
      if (localStorage.getItem(chatSavePreferenceKey) !== "1") return;
      const stored = chatMessages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .slice(-80);
      localStorage.setItem(chatHistoryKey, JSON.stringify(stored));
    } catch (_) {
      setChatStatus("Penyimpanan lokal tidak tersedia", "error");
    }
  }

  function syncChatControls() {
    const input = document.getElementById("chatInput");
    const send = document.getElementById("chatSendButton");
    const load = document.getElementById("chatLoadButton");
    const unload = document.getElementById("chatUnloadButton");
    const select = document.getElementById("chatModelSelect");
    if (input) input.disabled = !chatEngine || chatGenerating;
    if (send) send.disabled = !chatEngine || chatGenerating;
    if (load) {
      load.disabled = chatLoading || !!chatEngine;
      load.hidden = !!chatEngine;
      load.textContent = chatLoading ? "Menyiapkan model…" : "Muat model lokal";
    }
    if (unload) unload.hidden = !chatEngine;
    if (select) select.disabled = chatLoading || !!chatEngine;
    const statusMessage = chatLoading
      ? "Memuat model lokal…"
      : chatGenerating
        ? "Sedang menghasilkan jawaban…"
        : chatLastError
          ? chatLastError
          : chatEngine
            ? "Model siap · berjalan lokal"
            : "Model belum aktif";
    const statusType = chatLoading ? "loading" : chatGenerating ? "loading" : chatLastError ? "error" : chatEngine ? "ready" : "idle";
    setChatStatus(statusMessage, statusType);
  }

  async function loadChatModel() {
    if (chatLoading || chatEngine) return;
    if (!window.isSecureContext) {
      setChatStatus("WebGPU memerlukan HTTPS atau localhost", "error");
      return;
    }
    if (!navigator.gpu || typeof navigator.gpu.requestAdapter !== "function") {
      setChatStatus("WebGPU tidak tersedia di browser ini", "error");
      return;
    }
    chatLoading = true;
    chatLastError = "";
    syncChatControls();
    updateChatProgress({ progress: 0, text: "Memeriksa GPU adapter…" });
    const select = document.getElementById("chatModelSelect");
    const selectedModel = select ? select.value : "Llama-3.2-1B-Instruct-q4f16_1-MLC";
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error("GPU adapter tidak ditemukan. Periksa browser, driver, dan dukungan GPU.");
      updateChatProgress({ progress: 0.02, text: "Memuat runtime WebLLM…" });
      const runtime = await import("https://esm.run/@mlc-ai/web-llm@0.2.87");
      chatWorker = new Worker(new URL("assets/js/webllm-worker.js", document.baseURI), { type: "module" });
      let startupPending = true;
      let rejectWorkerStartup;
      const workerStartupFailure = new Promise((_, reject) => {
        rejectWorkerStartup = reject;
      });
      const handleWorkerFailure = (message) => {
        const failure = new Error(message);
        chatLastError = "Worker model mengalami kesalahan: " + message;
        setChatStatus(chatLastError, "error");
        if (startupPending) {
          startupPending = false;
          rejectWorkerStartup(failure);
        }
      };
      chatWorker.addEventListener("error", (event) => {
        handleWorkerFailure(event.message || "unknown worker error");
      });
      chatWorker.addEventListener("messageerror", () => {
        handleWorkerFailure("pesan dari worker tidak dapat dibaca");
      });
      chatModelId = selectedModel;
      const engineInitialization = runtime.CreateWebWorkerMLCEngine(chatWorker, selectedModel, {
        initProgressCallback: (progress) => updateChatProgress(progress)
      });
      chatEngine = await Promise.race([engineInitialization, workerStartupFailure]);
      startupPending = false;
      const progress = document.getElementById("chatProgress");
      if (progress) progress.hidden = true;
      syncChatControls();
      paintChatMessages();
    } catch (error) {
      if (chatWorker) chatWorker.terminate();
      chatWorker = null;
      chatEngine = null;
      chatModelId = "";
      chatLoading = false;
      const progress = document.getElementById("chatProgress");
      if (progress) progress.hidden = true;
      chatLastError = "Gagal memuat model: " + (error && error.message ? error.message : "periksa koneksi dan kompatibilitas");
      syncChatControls();
    } finally {
      chatLoading = false;
      syncChatControls();
    }
  }

  async function unloadChatModel() {
    if (!chatEngine || chatGenerating) return;
    try {
      await chatEngine.unload();
    } catch (_) {}
    if (chatWorker) chatWorker.terminate();
    chatWorker = null;
    chatEngine = null;
    chatModelId = "";
    syncChatControls();
  }

  async function submitChatMessage(value) {
    const prompt = String(value || "").trim();
    if (!prompt || !chatEngine || chatGenerating) return;
    chatGenerating = true;
    chatLastError = "";
    chatMessages.push({ role: "user", content: prompt });
    const assistantMessage = { role: "assistant", content: "" };
    chatMessages.push(assistantMessage);
    paintChatMessages();
    syncChatControls();
    const host = document.getElementById("chatMessages");
    const answerNode = host && host.querySelector(".chat-message:last-child .chat-message-text");
    try {
      const stream = await chatEngine.chat.completions.create({
        messages: [chatSystemMessage, ...chatMessages.slice(1, -1).slice(-24)],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 768,
        stream: true
      });
      for await (const chunk of stream) {
        const delta = chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta
          ? chunk.choices[0].delta.content || ""
          : "";
        if (!delta) continue;
        assistantMessage.content += delta;
        if (answerNode) answerNode.textContent = assistantMessage.content;
        if (host) host.scrollTop = host.scrollHeight;
      }
      if (!assistantMessage.content) assistantMessage.content = "Model tidak menghasilkan teks untuk permintaan ini.";
      saveChatHistory();
    } catch (error) {
      assistantMessage.content = "Terjadi kesalahan saat menghasilkan jawaban: " + (error && error.message ? error.message : "unknown error");
      if (answerNode) answerNode.textContent = assistantMessage.content;
      chatLastError = "Generasi gagal: " + (error && error.message ? error.message : "periksa resource perangkat");
      saveChatHistory();
    } finally {
      chatGenerating = false;
      syncChatControls();
    }
  }

  function bindChatWorkspace() {
    const saveToggle = document.getElementById("chatSaveHistory");
    const composer = document.getElementById("chatComposer");
    const input = document.getElementById("chatInput");
    const modelSelect = document.getElementById("chatModelSelect");
    const modelHint = document.getElementById("chatModelHint");
    const loadButton = document.getElementById("chatLoadButton");
    const unloadButton = document.getElementById("chatUnloadButton");
    const clearButton = document.getElementById("chatClearButton");
    if (saveToggle) {
      try { saveToggle.checked = localStorage.getItem(chatSavePreferenceKey) === "1"; } catch (_) {}
      saveToggle.addEventListener("change", () => {
        try {
          if (saveToggle.checked) {
            localStorage.setItem(chatSavePreferenceKey, "1");
            saveChatHistory();
          } else {
            localStorage.removeItem(chatSavePreferenceKey);
            localStorage.removeItem(chatHistoryKey);
          }
        } catch (_) {}
      });
    }
    if (modelSelect && modelHint) {
      modelSelect.addEventListener("change", () => {
        const option = modelSelect.selectedOptions[0];
        const memory = option ? option.dataset.vram : "";
        modelHint.textContent = "Estimasi VRAM manifest: ±" + memory + " MB. Nilai bukan jaminan kebutuhan minimal; kompatibilitas tetap bergantung pada perangkat.";
      });
    }
    if (loadButton) loadButton.addEventListener("click", loadChatModel);
    if (unloadButton) unloadButton.addEventListener("click", unloadChatModel);
    if (clearButton) clearButton.addEventListener("click", () => {
      chatMessages = [chatSystemMessage];
      try { localStorage.removeItem(chatHistoryKey); } catch (_) {}
      paintChatMessages();
    });
    if (composer) composer.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!input || !input.value.trim() || !chatEngine) return;
      const prompt = input.value.trim();
      input.value = "";
      input.style.height = "auto";
      await submitChatMessage(prompt);
    });
    if (input) input.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (composer) composer.requestSubmit();
      }
    });
    if (input) input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 150) + "px";
    });
    paintChatMessages();
    syncChatControls();
  }

  function renderEngineMetrics() {
    return '<div class="engine-metrics"><div class="engine-metric"><span>Browser GPU</span><strong id="engineGpu">Memeriksa…</strong></div><div class="engine-metric"><span>Secure context</span><strong id="engineSecure">Memeriksa…</strong></div><div class="engine-metric"><span>AI runtime</span><strong>WebLLM · AI Chat</strong></div></div>';
  }

  function renderSettingsPanel() {
    const theme = document.body.dataset.theme === "light" ? "Terang" : "Gelap";
    return '<div class="stage-side-card" style="margin-top:13px"><h3>Preferensi workspace</h3><div class="settings-row"><span>Tema saat ini</span><strong id="themeSetting">' + theme + '</strong></div><div class="settings-row"><span>Penyimpanan lokal</span><strong>Tema + riwayat Chat opsional</strong></div><div class="settings-row"><span>Riwayat AI</span><strong>Opt-in · hanya browser ini</strong></div></div>';
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
      if (window.location.hash !== nextHash) history.pushState(null, "", nextHash);
    }
    closeSidebar();
  }

  document.addEventListener("click", (event) => {

    const promptTrigger = event.target.closest("[data-chat-prompt]");
    if (promptTrigger) {
      const input = document.getElementById("chatInput");
      if (input) {
        input.value = promptTrigger.dataset.chatPrompt || "";
        input.focus();
      }
      return;
    }
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