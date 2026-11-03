(function (global) {
  "use strict";

  const MAX_FILE_BYTES = 100 * 1024 * 1024;
  const MAX_DURATION_SECONDS = 600;
  const MAX_FRAME_SIDE = 4096;
  const MAX_FRAME_PIXELS = 16_000_000;
  let state = null;

  function render() {
    return [
      '<div class="module-page video-studio-page">',
        '<button class="module-back" type="button" data-page="home"><svg aria-hidden="true"><use href="#i-arrow"></use></svg> Kembali ke overview</button>',
        '<div class="module-heading-row">',
          '<span class="module-heading-icon icon-orange"><svg aria-hidden="true"><use href="#i-video"></use></svg></span>',
          '<div><div class="eyebrow"><span class="eyebrow-pulse"></span> CREATIVE STUDIO · LOCAL VIDEO TOOLS</div><h1>Video Studio</h1><p>Putar video lokal, pilih titik waktu, dan ambil frame sebagai gambar PNG langsung di browser.</p></div>',
        '</div>',
        '<div class="video-studio-grid">',
          '<section class="video-workspace-card video-preview-card">',
            '<div class="video-card-heading"><div><span class="chat-panel-label">VIDEO PREVIEW</span><h2>Pratinjau video</h2></div><span class="video-local-indicator"><i></i> Lokal di browser</span></div>',
            '<label class="video-dropzone" id="videoDropzone" for="videoFileInput">',
              '<input id="videoFileInput" type="file" accept="video/*" hidden>',
              '<span class="video-dropzone-icon"><svg aria-hidden="true"><use href="#i-upload"></use></svg></span>',
              '<strong>Pilih video atau seret ke sini</strong>',
              '<span>Format mengikuti dukungan browser · Maksimal 100 MB dan 10 menit</span>',
              '<span class="video-dropzone-action">Pilih file video</span>',
            '</label>',
            '<div class="video-loaded-panel" id="videoLoadedPanel" hidden>',
              '<video id="videoPlayer" controls playsinline preload="metadata"></video>',
              '<div class="video-source-meta"><strong id="videoSourceName">Video</strong><span id="videoSourceDetails">-</span></div>',
            '</div>',
            '<p class="video-source-footnote" id="videoSourceFootnote">Pilih video untuk melihat metadata dan menentukan frame yang akan diambil.</p>',
          '</section>',
          '<aside class="video-workspace-card video-frame-card">',
            '<div class="video-card-heading"><div><span class="chat-panel-label">FRAME CAPTURE</span><h2>Ambil gambar dari video</h2></div></div>',
            '<div class="video-control-group">',
              '<label class="video-control-label" for="videoFrameTime">Waktu frame (detik)</label>',
              '<input class="video-time-input" id="videoFrameTime" type="number" min="0" step="0.01" value="0" disabled>',
              '<p class="video-help-text">Masukkan timestamp, lalu ambil satu frame dari posisi tersebut.</p>',
              '<button type="button" id="videoCaptureButton" class="button-primary video-capture-button" disabled>Ambil frame PNG <svg aria-hidden="true"><use href="#i-arrow"></use></svg></button>',
              '<button type="button" id="videoDownloadButton" class="video-download-button" disabled>Unduh frame PNG</button>',
              '<button type="button" id="videoClearButton" class="video-clear-button" disabled>Hapus video</button>',
            '</div>',
            '<div class="video-frame-result" id="videoFrameResult" hidden><span class="chat-panel-label">FRAME HASIL</span><img id="videoFrameImage" alt="Frame video yang berhasil diambil"><span id="videoFrameInfo"></span></div>',
            '<p class="video-status" id="videoStatus" role="status" aria-live="polite">Pilih video untuk memulai. File diproses di browser dan tidak diunggah.</p>',
          '</aside>',
        '</div>',
        '<div class="video-capability-note"><div class="video-note-icon"><svg aria-hidden="true"><use href="#i-shield"></use></svg></div><div><strong>Pemrosesan lokal dan batas fitur</strong><p>Video dibuka langsung di browser. Versi awal mendukung pratinjau, pembacaan metadata, dan ekspor frame PNG dengan batas ukuran file 100 MB, durasi 10 menit, sisi frame 4.096 piksel, serta 16 megapiksel. Format dan codec mengikuti dukungan browser. Pemotongan timeline, penggabungan klip, ekstraksi audio, transkripsi, dan generasi video AI belum diaktifkan.</p></div></div>',
        '<footer class="main-footer"><span>© 2026 LOKAL AI <b>·</b> SMALAN</span><span>Local-first by design.</span></footer>',
      '</div>'
    ].join("");
  }

  function bind(root) {
    destroy();
    const get = (id) => root.querySelector("#" + id);
    const fileInput = get("videoFileInput");
    const dropzone = get("videoDropzone");
    const loadedPanel = get("videoLoadedPanel");
    const player = get("videoPlayer");
    const frameTime = get("videoFrameTime");
    const captureButton = get("videoCaptureButton");
    const downloadButton = get("videoDownloadButton");
    const clearButton = get("videoClearButton");
    const frameResult = get("videoFrameResult");
    const frameImage = get("videoFrameImage");
    const status = get("videoStatus");

    if (!fileInput || !player || !status) return;
    state = {
      root,
      file: null,
      sourceUrl: "",
      previewUrl: "",
      frameBlob: null,
      busy: false,
      duration: 0,
      durationKnown: false,
      frameWidth: 0,
      frameHeight: 0,
      cancelPendingWait: null
    };
    const videoState = state;

    function setStatus(message, type) {
      if (state !== videoState) return;
      status.textContent = message;
      status.dataset.state = type || "info";
    }

    function releasePreview() {
      if (videoState.previewUrl) URL.revokeObjectURL(videoState.previewUrl);
      videoState.previewUrl = "";
      videoState.frameBlob = null;
      if (frameImage) frameImage.removeAttribute("src");
      if (frameResult) frameResult.hidden = true;
      if (downloadButton) downloadButton.disabled = true;
    }

    function validateFrameDimensions() {
      const width = player.videoWidth;
      const height = player.videoHeight;
      return width > 0 && height > 0 && width <= MAX_FRAME_SIDE &&
        height <= MAX_FRAME_SIDE && width * height <= MAX_FRAME_PIXELS;
    }

    function updateCaptureState() {
      if (state !== videoState) return;
      const value = Number(frameTime.value);
      const maxTime = videoState.durationKnown ? videoState.duration : MAX_DURATION_SECONDS;
      const validTime = Number.isFinite(value) && value >= 0 && value <= maxTime;
      captureButton.disabled = !videoState.file || videoState.busy || !validTime ||
        !validateFrameDimensions() || (videoState.durationKnown && videoState.duration > MAX_DURATION_SECONDS);
      clearButton.disabled = !videoState.file || videoState.busy;
      frameTime.disabled = !videoState.file || videoState.busy;
    }

    function setControlsEnabled(enabled) {
      if (dropzone) dropzone.hidden = enabled;
      if (loadedPanel) loadedPanel.hidden = !enabled;
      if (get("videoSourceFootnote")) get("videoSourceFootnote").hidden = enabled;
      if (!enabled) {
        captureButton.disabled = true;
        downloadButton.disabled = true;
        clearButton.disabled = true;
        frameTime.disabled = true;
      } else {
        updateCaptureState();
      }
    }

    function clearVideo(message) {
      if (state !== videoState) return;
      player.pause();
      player.removeAttribute("src");
      player.load();
      if (videoState.sourceUrl) URL.revokeObjectURL(videoState.sourceUrl);
      videoState.sourceUrl = "";
      videoState.file = null;
      videoState.duration = 0;
      videoState.durationKnown = false;
      videoState.frameWidth = 0;
      videoState.frameHeight = 0;
      frameTime.value = "0";
      releasePreview();
      fileInput.value = "";
      get("videoSourceName").textContent = "Video";
      get("videoSourceDetails").textContent = "-";
      setControlsEnabled(false);
      setStatus(message || "Pilih video untuk memulai. File diproses di browser dan tidak diunggah.", "info");
    }

    function loadFile(file) {
      if (!file) return;
      fileInput.value = "";
      if (state !== videoState || videoState.busy) return;
      if (!(file.type || "").startsWith("video/")) {
        setStatus("File tidak dikenali sebagai video. Pilih berkas video yang didukung browser.", "error");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setStatus("Ukuran file melebihi batas 100 MB.", "error");
        return;
      }
      player.pause();
      if (videoState.sourceUrl) URL.revokeObjectURL(videoState.sourceUrl);
      releasePreview();
      videoState.file = file;
      videoState.sourceUrl = URL.createObjectURL(file);
      videoState.duration = 0;
      videoState.durationKnown = false;
      videoState.frameWidth = 0;
      videoState.frameHeight = 0;
      setControlsEnabled(true);
      captureButton.disabled = true;
      frameTime.disabled = true;
      get("videoSourceName").textContent = file.name;
      get("videoSourceDetails").textContent = (file.size / 1024 / 1024).toFixed(2) + " MB · Membaca metadata…";
      setStatus("Membuka metadata video di browser…", "info");
      player.src = videoState.sourceUrl;
      player.load();
    }

    function onMetadataLoaded() {
      if (state !== videoState || !videoState.file) return;
      const duration = player.duration;
      const width = player.videoWidth;
      const height = player.videoHeight;
      if (!width || !height) {
        setStatus("Metadata dimensi video tidak lengkap atau tidak valid.", "error");
        return;
      }
      videoState.durationKnown = Number.isFinite(duration) && duration > 0;
      videoState.duration = videoState.durationKnown ? duration : MAX_DURATION_SECONDS;
      videoState.frameWidth = width;
      videoState.frameHeight = height;
      frameTime.max = String(Math.min(videoState.duration, MAX_DURATION_SECONDS));
      frameTime.value = "0";
      const fileSize = (videoState.file.size / 1024 / 1024).toFixed(2);
      const durationLabel = videoState.durationKnown ? duration.toFixed(2) + " detik" : "Durasi tidak tersedia";
      get("videoSourceDetails").textContent = width + " × " + height + " px · " +
        durationLabel + " · " + fileSize + " MB";
      const tooLong = videoState.durationKnown && duration > MAX_DURATION_SECONDS;
      const tooLargeFrame = !validateFrameDimensions();
      if (tooLong || tooLargeFrame) {
        const reason = tooLong ? "Durasi video melebihi batas 10 menit." :
          "Resolusi frame melebihi batas 4.096 px per sisi atau 16 megapiksel.";
        setStatus(reason + " Video dapat dipratinjau, tetapi ekspor frame dinonaktifkan.", "error");
        updateCaptureState();
        return;
      }
      const readyMessage = videoState.durationKnown
        ? "Video siap. Pilih timestamp untuk mengambil frame PNG."
        : "Video siap. Durasi tidak tercantum; frame akan dicari melalui pemutaran lokal. Ambil timestamp secara berurutan.";
      setStatus(readyMessage, videoState.durationKnown ? "success" : "info");
      updateCaptureState();
    }

    function waitForSeeked(target) {
      if (Math.abs(player.currentTime - target) < 0.015 && !player.seeking) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
          player.removeEventListener("seeked", onSeeked);
          player.removeEventListener("error", onError);
          global.clearTimeout(timeout);
          if (videoState.cancelPendingWait === cancelWait) videoState.cancelPendingWait = null;
        };
        const finish = (error) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (error) reject(error);
          else resolve();
        };
        const cancelWait = () => finish(new Error("Pengambilan frame dibatalkan karena Video Studio ditutup atau dimuat ulang."));
        videoState.cancelPendingWait = cancelWait;
        const onSeeked = () => finish();
        const onError = () => finish(new Error("Browser gagal berpindah ke timestamp yang dipilih."));
        const timeout = global.setTimeout(() => finish(new Error("Waktu tunggu perpindahan frame habis.")), 8000);
        player.addEventListener("seeked", onSeeked, { once: true });
        player.addEventListener("error", onError, { once: true });
        player.currentTime = target;
      });
    }

    function waitForPlaybackTime(target) {
      if (player.currentTime >= target - 0.015 && !player.seeking) return Promise.resolve();
      return new Promise((resolve, reject) => {
        let settled = false;
        const previousMuted = player.muted;
        const cleanup = () => {
          player.removeEventListener("timeupdate", onTimeUpdate);
          player.removeEventListener("ended", onEnded);
          player.removeEventListener("error", onError);
          global.clearTimeout(timeout);
          player.muted = previousMuted;
          if (videoState.cancelPendingWait === cancelWait) videoState.cancelPendingWait = null;
        };
        const finish = (error) => {
          if (settled) return;
          settled = true;
          cleanup();
          player.pause();
          if (error) reject(error);
          else resolve();
        };
        const cancelWait = () => finish(new Error("Pengambilan frame dibatalkan karena Video Studio ditutup atau dimuat ulang."));
        videoState.cancelPendingWait = cancelWait;
        const onTimeUpdate = () => {
          if (player.currentTime >= target - 0.015) finish();
        };
        const onEnded = () => finish(new Error("Video berakhir sebelum timestamp yang dipilih tercapai."));
        const onError = () => finish(new Error("Browser gagal memutar video sampai timestamp yang dipilih."));
        const timeout = global.setTimeout(() => finish(new Error("Waktu tunggu pemutaran frame habis.")), 12000);
        player.addEventListener("timeupdate", onTimeUpdate);
        player.addEventListener("ended", onEnded, { once: true });
        player.addEventListener("error", onError, { once: true });
        player.muted = true;
        const playResult = player.play();
        if (playResult && typeof playResult.catch === "function") {
          playResult.catch(() => finish(new Error("Browser tidak dapat memutar video untuk mengambil frame.")));
        }
      });
    }

    function waitForTargetFrame(target) {
      if (videoState.durationKnown) return waitForSeeked(target);
      if (Math.abs(player.currentTime - target) < 0.015 && !player.seeking) return Promise.resolve();
      if (player.currentTime > target + 0.015) {
        return Promise.reject(new Error("Video ini tidak menyediakan indeks durasi untuk mundur. Ambil timestamp secara berurutan atau muat ulang videonya."));
      }
      return waitForPlaybackTime(target);
    }

    function canvasToBlob(canvas) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Browser tidak dapat menyiapkan frame PNG."));
        }, "image/png");
      });
    }

    async function captureFrame() {
      if (state !== videoState || !videoState.file || videoState.busy) return;
      const requested = Number(frameTime.value);
      if (!Number.isFinite(requested) || requested < 0 || requested > videoState.duration ||
        (!videoState.durationKnown && requested > MAX_DURATION_SECONDS)) {
        setStatus("Timestamp harus berada di antara 0 dan durasi video yang diizinkan.", "error");
        return;
      }
      if (!validateFrameDimensions()) {
        setStatus("Resolusi frame melebihi batas pemrosesan.", "error");
        return;
      }
      videoState.busy = true;
      updateCaptureState();
      downloadButton.disabled = true;
      setStatus("Memindahkan video ke frame terpilih…", "info");
      let canvas;
      try {
        player.pause();
        await waitForTargetFrame(requested);
        if (state !== videoState) return;
        const width = player.videoWidth;
        const height = player.videoHeight;
        if (!width || !height || width > MAX_FRAME_SIDE || height > MAX_FRAME_SIDE || width * height > MAX_FRAME_PIXELS) {
          throw new Error("Dimensi frame tidak memenuhi batas ekspor.");
        }
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D tidak tersedia pada browser ini.");
        context.drawImage(player, 0, 0, width, height);
        const blob = await canvasToBlob(canvas);
        if (state !== videoState) return;
        releasePreview();
        videoState.frameBlob = blob;
        videoState.previewUrl = URL.createObjectURL(blob);
        frameImage.src = videoState.previewUrl;
        frameResult.hidden = false;
        get("videoFrameInfo").textContent = width + " × " + height + " px · " + player.currentTime.toFixed(2) + " detik";
        downloadButton.disabled = false;
        setStatus("Frame berhasil diambil sebagai PNG. File tetap berada di perangkat sampai diunduh.", "success");
      } catch (error) {
        if (state === videoState) {
          setStatus(error && error.message ? error.message : "Gagal mengambil frame video.", "error");
        }
      } finally {
        if (canvas) { canvas.width = 0; canvas.height = 0; }
        videoState.busy = false;
        if (state === videoState) updateCaptureState();
      }
    }

    function downloadFrame() {
      if (state !== videoState || !videoState.frameBlob || videoState.busy) return;
      const url = URL.createObjectURL(videoState.frameBlob);
      const anchor = document.createElement("a");
      const baseName = videoState.file.name.replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "video";
      const timestamp = Number(frameTime.value).toFixed(2).replace(".", "-");
      anchor.href = url;
      anchor.download = baseName + "-frame-" + timestamp + ".png";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      global.setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    fileInput.addEventListener("change", () => loadFile(fileInput.files && fileInput.files[0]));
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      loadFile(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]);
    });
    player.addEventListener("loadedmetadata", onMetadataLoaded);
    player.addEventListener("error", () => {
      if (state === videoState && videoState.file) {
        setStatus("Browser tidak dapat memutar codec video ini. Coba MP4 atau WebM yang kompatibel.", "error");
      }
    });
    frameTime.addEventListener("input", updateCaptureState);
    frameTime.addEventListener("change", () => {
      updateCaptureState();
      if (videoState.frameBlob) releasePreview();
    });
    captureButton.addEventListener("click", captureFrame);
    downloadButton.addEventListener("click", downloadFrame);
    clearButton.addEventListener("click", () => clearVideo());
    setControlsEnabled(false);
  }

  function destroy() {
    if (!state) return;
    const current = state;
    if (current.cancelPendingWait) current.cancelPendingWait();
    if (current.root) {
      const player = current.root.querySelector("#videoPlayer");
      if (player) {
        player.pause();
        player.removeAttribute("src");
        player.load();
      }
    }
    if (current.sourceUrl) URL.revokeObjectURL(current.sourceUrl);
    if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
    state = null;
  }

  global.LokalAIVideoStudio = Object.freeze({ render, bind, destroy });
})(window);
