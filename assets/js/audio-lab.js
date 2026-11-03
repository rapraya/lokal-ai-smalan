(function (global) {
  "use strict";

  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const MAX_DURATION_SECONDS = 300;
  const MAX_DECODED_SAMPLES = 20_000_000;
  const WAVEFORM_WIDTH = 1000;
  const WAVEFORM_HEIGHT = 180;
  let state = null;

  function render() {
    return [
      '<div class="module-page audio-lab-page">',
        '<button class="module-back" type="button" data-page="home"><svg aria-hidden="true"><use href="#i-arrow"></use></svg> Kembali ke overview</button>',
        '<div class="module-heading-row">',
          '<span class="module-heading-icon icon-mint"><svg aria-hidden="true"><use href="#i-audio"></use></svg></span>',
          '<div><div class="eyebrow"><span class="eyebrow-pulse"></span> CREATIVE STUDIO · LOCAL AUDIO EDITOR</div><h1>Audio Lab</h1><p>Pratinjau audio, pilih bagian yang dibutuhkan, lalu ekspor potongannya sebagai WAV langsung di browser.</p></div>',
        '</div>',
        '<div class="audio-lab-grid">',
          '<section class="audio-workspace-card audio-source-card">',
            '<div class="audio-card-heading"><div><span class="chat-panel-label">AUDIO WORKSPACE</span><h2>Area kerja suara</h2></div><span class="audio-local-indicator"><i></i> Lokal di browser</span></div>',
            '<label class="audio-dropzone" id="audioDropzone" for="audioFileInput">',
              '<input id="audioFileInput" type="file" accept="audio/*" hidden>',
              '<span class="audio-dropzone-icon"><svg aria-hidden="true"><use href="#i-upload"></use></svg></span>',
              '<strong>Pilih audio atau seret ke sini</strong>',
              '<span>Format mengikuti dukungan browser · Maksimal 20 MB dan 5 menit</span>',
              '<span class="audio-dropzone-action">Pilih file audio</span>',
            '</label>',
            '<div class="audio-loaded-panel" id="audioLoadedPanel" hidden>',
              '<div class="audio-track-meta"><div class="audio-track-icon"><svg aria-hidden="true"><use href="#i-audio"></use></svg></div><div class="audio-track-copy"><strong id="audioSourceName">Audio</strong><span id="audioSourceDetails">-</span></div></div>',
              '<audio id="audioPlayer" controls preload="metadata"></audio>',
              '<div class="audio-waveform-wrap"><div class="audio-waveform-heading"><span class="chat-panel-label">WAVEFORM</span><span id="audioWaveformDuration">00:00</span></div><canvas id="audioWaveform" width="1000" height="180" role="img" aria-label="Visualisasi gelombang audio"></canvas><div class="audio-waveform-legend"><span><i></i> Rentang ekspor</span><span>Visualisasi amplitudo</span></div></div>',
            '</div>',
            '<div class="audio-source-footnote" id="audioSourceFootnote">Pilih file untuk melihat durasi dan bentuk gelombangnya.</div>',
          '</section>',
          '<aside class="audio-workspace-card audio-trim-card">',
            '<div class="audio-card-heading"><div><span class="chat-panel-label">TRIM & EXPORT</span><h2>Potong audio</h2></div></div>',
            '<div class="audio-control-group">',
              '<label class="audio-control-label">Rentang pilihan</label>',
              '<div class="audio-trim-fields"><label>Mulai (detik)<input id="audioTrimStart" type="number" min="0" step="0.01" value="0" disabled></label><label>Akhir (detik)<input id="audioTrimEnd" type="number" min="0" step="0.01" value="0" disabled></label></div>',
              '<div class="audio-selection-summary"><span>Durasi potongan</span><strong id="audioSelectionDuration">00:00</strong></div>',
              '<p class="audio-help-text">Gunakan titik awal dan akhir untuk menentukan bagian yang akan dipratinjau dan diekspor.</p>',
            '</div>',
            '<div class="audio-export-actions"><button type="button" id="audioPreviewSelectionButton" class="audio-preview-button" disabled>Putar rentang pilihan</button><button type="button" id="audioExportButton" class="button-primary audio-export-button" disabled>Ekspor potongan WAV <svg aria-hidden="true"><use href="#i-arrow"></use></svg></button><button type="button" id="audioClearButton" class="audio-clear-button" disabled>Hapus audio</button></div>',
            '<p class="audio-status" id="audioStatus" role="status" aria-live="polite">Pilih file audio untuk memulai. File diproses di browser dan tidak diunggah.</p>',
          '</aside>',
        '</div>',
        '<div class="audio-capability-note"><div class="audio-note-icon"><svg aria-hidden="true"><use href="#i-shield"></use></svg></div><div><strong>Pemrosesan lokal dan batas fitur</strong><p>Audio dibaca dan dipotong di perangkat ini. Versi awal mendukung pemutaran, visualisasi waveform, pemilihan rentang, dan ekspor WAV PCM 16-bit. Transkripsi AI, text-to-speech, pemisahan suara, serta analisis audio berbasis model belum diaktifkan. Keberhasilan membaca format bergantung pada kemampuan browser.</p></div></div>',
        '<footer class="main-footer"><span>© 2026 LOKAL AI <b>·</b> SMALAN</span><span>Local-first by design.</span></footer>',
      '</div>'
    ].join("");
  }

  function formatTime(value) {
    const total = Math.max(0, Math.floor(Number(value) || 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    const hours = Math.floor(minutes / 60);
    const mm = String(minutes % 60).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return hours ? String(hours).padStart(2, "0") + ":" + mm + ":" + ss : mm + ":" + ss;
  }

  function encodeWav(audioBuffer, startFrame, endFrame) {
    const channels = audioBuffer.numberOfChannels;
    const frames = endFrame - startFrame;
    if (!Number.isInteger(frames) || frames < 1 || channels < 1) {
      throw new Error("Rentang audio tidak valid.");
    }
    if (frames * channels > MAX_DECODED_SAMPLES) {
      throw new Error("Rentang terlalu besar untuk diekspor pada batas memori aman.");
    }

    const bytesPerSample = 2;
    const dataSize = frames * channels * bytesPerSample;
    const output = new ArrayBuffer(44 + dataSize);
    const view = new DataView(output);
    const writeText = (offset, value) => {
      for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
    };

    writeText(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeText(8, "WAVE");
    writeText(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeText(36, "data");
    view.setUint32(40, dataSize, true);

    const channelData = [];
    for (let channel = 0; channel < channels; channel += 1) {
      channelData.push(audioBuffer.getChannelData(channel));
    }
    let offset = 44;
    for (let frame = startFrame; frame < endFrame; frame += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
        view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
        offset += bytesPerSample;
      }
    }
    return new Blob([output], { type: "audio/wav" });
  }

  function bind(root) {
    destroy();
    const get = (id) => root.querySelector("#" + id);
    const fileInput = get("audioFileInput");
    const dropzone = get("audioDropzone");
    const loadedPanel = get("audioLoadedPanel");
    const player = get("audioPlayer");
    const waveform = get("audioWaveform");
    const startInput = get("audioTrimStart");
    const endInput = get("audioTrimEnd");
    const previewButton = get("audioPreviewSelectionButton");
    const exportButton = get("audioExportButton");
    const clearButton = get("audioClearButton");
    const status = get("audioStatus");

    if (!fileInput || !player || !waveform || !status) return;
    state = {
      root,
      file: null,
      buffer: null,
      sourceUrl: "",
      busy: false,
      previewEnd: 0
    };
    const audioState = state;

    function setStatus(message, type) {
      if (state !== audioState) return;
      status.textContent = message;
      status.dataset.state = type || "info";
    }

    function selectedRange() {
      if (!audioState.buffer) return null;
      const duration = audioState.buffer.duration;
      const start = Number(startInput.value);
      const end = Number(endInput.value);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > duration || end <= start) {
        return null;
      }
      const startFrame = Math.max(0, Math.min(audioState.buffer.length - 1, Math.floor(start * audioState.buffer.sampleRate)));
      const endFrame = Math.max(startFrame + 1, Math.min(audioState.buffer.length, Math.floor(end * audioState.buffer.sampleRate)));
      return { start, end, startFrame, endFrame };
    }

    function drawWaveform() {
      const context = waveform.getContext("2d");
      if (!context) {
        setStatus("Canvas 2D tidak tersedia pada browser ini.", "error");
        return;
      }
      context.clearRect(0, 0, WAVEFORM_WIDTH, WAVEFORM_HEIGHT);
      context.fillStyle = "rgba(120, 145, 180, 0.08)";
      context.fillRect(0, 0, WAVEFORM_WIDTH, WAVEFORM_HEIGHT);
      if (!audioState.buffer) return;

      const duration = audioState.buffer.duration;
      const range = selectedRange();
      if (range) {
        const left = range.start / duration * WAVEFORM_WIDTH;
        const right = range.end / duration * WAVEFORM_WIDTH;
        context.fillStyle = "rgba(112, 160, 255, 0.15)";
        context.fillRect(0, 0, left, WAVEFORM_HEIGHT);
        context.fillRect(right, 0, WAVEFORM_WIDTH - right, WAVEFORM_HEIGHT);
        context.fillStyle = "rgba(80, 190, 160, 0.12)";
        context.fillRect(left, 0, right - left, WAVEFORM_HEIGHT);
      }

      const channels = [];
      for (let channel = 0; channel < audioState.buffer.numberOfChannels; channel += 1) {
        channels.push(audioState.buffer.getChannelData(channel));
      }
      const length = audioState.buffer.length;
      context.strokeStyle = "#76a9f7";
      context.lineWidth = 1.4;
      context.beginPath();
      for (let column = 0; column < WAVEFORM_WIDTH; column += 1) {
        const from = Math.floor(column / WAVEFORM_WIDTH * length);
        const to = Math.max(from + 1, Math.floor((column + 1) / WAVEFORM_WIDTH * length));
        let peak = 0;
        for (let frame = from; frame < to; frame += 1) {
          for (let channel = 0; channel < channels.length; channel += 1) {
            peak = Math.max(peak, Math.abs(channels[channel][frame] || 0));
          }
        }
        const amplitude = Math.max(1, peak * (WAVEFORM_HEIGHT * 0.43));
        context.moveTo(column + 0.5, WAVEFORM_HEIGHT / 2 - amplitude);
        context.lineTo(column + 0.5, WAVEFORM_HEIGHT / 2 + amplitude);
      }
      context.stroke();
      const mid = WAVEFORM_HEIGHT / 2;
      context.strokeStyle = "rgba(190, 205, 225, 0.35)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, mid);
      context.lineTo(WAVEFORM_WIDTH, mid);
      context.stroke();
    }

    function updateSelection() {
      if (!audioState.buffer) return;
      const duration = audioState.buffer.duration;
      startInput.max = String(duration);
      endInput.max = String(duration);
      const range = selectedRange();
      if (!range) {
        get("audioSelectionDuration").textContent = "Rentang tidak valid";
        exportButton.disabled = true;
        previewButton.disabled = true;
        setStatus("Pastikan waktu akhir lebih besar dari waktu mulai dan tidak melebihi durasi audio.", "error");
        drawWaveform();
        return;
      }
      get("audioSelectionDuration").textContent = formatTime(range.end - range.start) + " (" + (range.end - range.start).toFixed(2) + " detik)";
      exportButton.disabled = audioState.busy;
      previewButton.disabled = audioState.busy;
      drawWaveform();
    }

    function setControlsEnabled(enabled) {
      startInput.disabled = !enabled || audioState.busy;
      endInput.disabled = !enabled || audioState.busy;
      previewButton.disabled = !enabled || audioState.busy;
      exportButton.disabled = !enabled || audioState.busy;
      clearButton.disabled = !enabled || audioState.busy;
      fileInput.disabled = audioState.busy;
      if (dropzone) dropzone.classList.toggle("has-audio", enabled);
      if (dropzone) dropzone.hidden = enabled;
      if (loadedPanel) loadedPanel.hidden = !enabled;
      if (get("audioSourceFootnote")) get("audioSourceFootnote").hidden = enabled;
      if (enabled) updateSelection();
    }

    function clearAudio(message) {
      if (state !== audioState) return;
      player.pause();
      player.removeAttribute("src");
      player.load();
      if (audioState.sourceUrl) URL.revokeObjectURL(audioState.sourceUrl);
      audioState.file = null;
      audioState.buffer = null;
      audioState.sourceUrl = "";
      audioState.previewEnd = 0;
      startInput.value = "0";
      endInput.value = "0";
      fileInput.value = "";
      waveform.getContext("2d")?.clearRect(0, 0, WAVEFORM_WIDTH, WAVEFORM_HEIGHT);
      if (get("audioSourceName")) get("audioSourceName").textContent = "Audio";
      if (get("audioSourceDetails")) get("audioSourceDetails").textContent = "-";
      if (get("audioWaveformDuration")) get("audioWaveformDuration").textContent = "00:00";
      if (get("audioSelectionDuration")) get("audioSelectionDuration").textContent = "00:00";
      setControlsEnabled(false);
      setStatus(message || "Pilih file audio untuk memulai. File diproses di browser dan tidak diunggah.", "info");
    }

    async function loadFile(file) {
      if (!file || state !== audioState || audioState.busy) return;
      if (!(file.type || "").startsWith("audio/")) {
        setStatus("File tidak dikenali sebagai audio. Pilih berkas audio yang didukung browser.", "error");
        fileInput.value = "";
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setStatus("Ukuran file melebihi batas 20 MB.", "error");
        fileInput.value = "";
        return;
      }

      if (audioState.sourceUrl) URL.revokeObjectURL(audioState.sourceUrl);
      audioState.file = file;
      audioState.buffer = null;
      audioState.sourceUrl = URL.createObjectURL(file);
      player.src = audioState.sourceUrl;
      player.load();
      audioState.busy = true;
      setControlsEnabled(false);
      setStatus("Membaca dan mendekode audio di browser…", "info");
      let audioContext;
      try {
        const AudioContextClass = global.AudioContext || global.webkitAudioContext;
        if (!AudioContextClass) throw new Error("Web Audio API tidak tersedia pada browser ini.");
        audioContext = new AudioContextClass({ sampleRate: 24000 });
        const bytes = await file.arrayBuffer();
        if (state !== audioState) return;
        const decoded = await audioContext.decodeAudioData(bytes.slice(0));
        if (state !== audioState) return;
        if (!Number.isFinite(decoded.duration) || decoded.duration <= 0 || decoded.duration > MAX_DURATION_SECONDS) {
          throw new Error("Durasi audio tidak valid atau melebihi batas 5 menit.");
        }
        if (decoded.length * decoded.numberOfChannels > MAX_DECODED_SAMPLES) {
          throw new Error("Audio membutuhkan memori terlalu besar. Coba file yang lebih pendek atau lebih sedikit kanal.");
        }
        audioState.buffer = decoded;
        startInput.value = "0";
        endInput.value = String(decoded.duration);
        get("audioSourceName").textContent = file.name;
        get("audioSourceDetails").textContent = decoded.sampleRate.toLocaleString("id-ID") + " Hz · " + decoded.numberOfChannels + " kanal · " + (file.size / 1024 / 1024).toFixed(2) + " MB";
        get("audioWaveformDuration").textContent = formatTime(decoded.duration);
        setControlsEnabled(true);
        setStatus("Audio siap. Pilih rentang untuk dipratinjau atau diekspor sebagai WAV.", "success");
      } catch (error) {
        if (state === audioState) {
          audioState.buffer = null;
          setControlsEnabled(false);
          const message = error && error.message ? error.message : "Browser tidak dapat membaca audio ini.";
          setStatus(message.includes("decode") || message.includes("Decoding") ? "Format atau codec audio ini tidak didukung oleh decoder browser." : message, "error");
        }
      } finally {
        if (audioContext && audioContext.state !== "closed") {
          try { await audioContext.close(); } catch (_) {}
        }
        if (state === audioState) {
          audioState.busy = false;
          setControlsEnabled(Boolean(audioState.buffer));
        }
      }
    }

    async function exportSelection() {
      const range = selectedRange();
      if (!range || !audioState.buffer || audioState.busy) {
        updateSelection();
        return;
      }
      audioState.busy = true;
      setControlsEnabled(true);
      setStatus("Menyiapkan potongan WAV di browser…", "info");
      try {
        const blob = encodeWav(audioState.buffer, range.startFrame, range.endFrame);
        const baseName = audioState.file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "audio";
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = baseName + "-trimmed.wav";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        global.setTimeout(() => URL.revokeObjectURL(url), 1500);
        setStatus("Potongan WAV berhasil disiapkan · " + (range.end - range.start).toFixed(2) + " detik · PCM 16-bit.", "success");
      } catch (error) {
        setStatus(error && error.message ? error.message : "Gagal mengekspor potongan audio.", "error");
      } finally {
        audioState.busy = false;
        if (state === audioState) setControlsEnabled(Boolean(audioState.buffer));
      }
    }

    function previewSelection() {
      const range = selectedRange();
      if (!range || !audioState.buffer || audioState.busy) {
        updateSelection();
        return;
      }
      audioState.previewEnd = range.end;
      player.currentTime = range.start;
      const playResult = player.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(() => setStatus("Browser tidak dapat memutar audio ini. Periksa dukungan codec perangkat.", "error"));
      }
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
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      loadFile(file);
    });
    startInput.addEventListener("change", updateSelection);
    startInput.addEventListener("input", updateSelection);
    endInput.addEventListener("change", updateSelection);
    endInput.addEventListener("input", updateSelection);
    previewButton.addEventListener("click", previewSelection);
    exportButton.addEventListener("click", exportSelection);
    clearButton.addEventListener("click", () => clearAudio());
    player.addEventListener("timeupdate", () => {
      if (state === audioState && !player.paused && audioState.previewEnd > 0 && player.currentTime >= audioState.previewEnd) {
        player.pause();
      }
    });
    setControlsEnabled(false);
  }

  function destroy() {
    if (!state) return;
    const current = state;
    if (current.root) {
      const player = current.root.querySelector("#audioPlayer");
      if (player) {
        player.pause();
        player.removeAttribute("src");
        player.load();
      }
    }
    if (current.sourceUrl) URL.revokeObjectURL(current.sourceUrl);
    state = null;
  }

  global.LokalAIAudioLab = Object.freeze({ render, bind, destroy });
})(window);
