(function (global) {
  "use strict";

  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const MAX_SIDE = 8000;
  const MAX_PIXELS = 40_000_000;
  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  let state = null;

  function render() {
    return [
      '<div class="module-page image-studio-page">',
        '<button class="module-back" type="button" data-page="home"><svg aria-hidden="true"><use href="#i-arrow"></use></svg> Kembali ke overview</button>',
        '<div class="module-heading-row">',
          '<span class="module-heading-icon icon-rose"><svg aria-hidden="true"><use href="#i-image"></use></svg></span>',
          '<div><div class="eyebrow"><span class="eyebrow-pulse"></span> CREATIVE STUDIO · LOCAL IMAGE EDITOR</div><h1>Image Studio</h1><p>Siapkan aset visual langsung di browser. Pilih gambar, atur orientasi dan dimensi, lalu ekspor sesuai kebutuhan.</p></div>',
        '</div>',
        '<div class="image-studio-grid">',
          '<section class="image-workspace-card image-preview-card">',
            '<div class="image-card-heading"><div><span class="chat-panel-label">CANVAS PREVIEW</span><h2>Area kerja gambar</h2></div><span class="image-local-indicator"><i></i> Lokal di browser</span></div>',
            '<label class="image-dropzone" id="imageDropzone" for="imageFileInput">',
              '<input id="imageFileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden>',
              '<span class="image-dropzone-icon"><svg aria-hidden="true"><use href="#i-upload"></use></svg></span>',
              '<strong>Pilih gambar atau seret ke sini</strong>',
              '<span>JPEG, PNG, atau WebP · Maksimal 20 MB</span>',
              '<span class="image-dropzone-action">Pilih file</span>',
            '</label>',
            '<div class="image-preview-container" id="imagePreviewContainer" hidden><img id="imagePreview" alt="Pratinjau gambar yang sedang diedit"></div>',
            '<div class="image-toolbar" id="imageToolbar" hidden>',
              '<button type="button" class="image-tool-button" data-image-action="rotate-left" disabled title="Putar 90 derajat ke kiri" aria-label="Putar ke kiri"><span aria-hidden="true">↶</span> Putar kiri</button>',
              '<button type="button" class="image-tool-button" data-image-action="rotate-right" disabled title="Putar 90 derajat ke kanan" aria-label="Putar ke kanan"><span aria-hidden="true">↷</span> Putar kanan</button>',
              '<button type="button" class="image-tool-button" data-image-action="flip-x" disabled aria-pressed="false">Balik horizontal</button>',
              '<button type="button" class="image-tool-button" data-image-action="flip-y" disabled aria-pressed="false">Balik vertikal</button>',
              '<button type="button" class="image-tool-button image-tool-reset" data-image-action="reset" disabled>Reset</button>',
            '</div>',
            '<div class="image-source-meta" id="imageSourceMeta" hidden><span id="imageSourceName"></span><span id="imageSourceDimensions"></span><span id="imageSourceSize"></span></div>',
          '</section>',
          '<aside class="image-workspace-card image-settings-card">',
            '<div class="image-card-heading"><div><span class="chat-panel-label">EXPORT SETTINGS</span><h2>Pengaturan ekspor</h2></div></div>',
            '<div class="image-control-group">',
              '<label class="image-control-label" for="imageWidth">Ukuran keluaran</label>',
              '<div class="image-dimension-row"><label>Lebar (px)<input id="imageWidth" type="number" min="1" max="8000" value="0" disabled></label><label>Tinggi (px)<input id="imageHeight" type="number" min="1" max="8000" value="0" disabled></label></div>',
              '<label class="image-check-row"><input id="imageKeepRatio" type="checkbox" checked disabled><span>Kunci rasio aspek</span></label>',
              '<p class="image-help-text">Dimensi maksimal 8.000 px per sisi dan 40 megapiksel.</p>',
            '</div>',
            '<div class="image-control-group">',
              '<label class="image-control-label" for="imageFormat">Format file</label>',
              '<select id="imageFormat" class="image-format-select" disabled><option value="image/png">PNG · kualitas lossless</option><option value="image/jpeg">JPEG · ukuran lebih kecil</option><option value="image/webp">WebP · format modern</option></select>',
              '<div class="image-quality-control" id="imageQualityControl"><div class="image-quality-heading"><label for="imageQuality">Kualitas</label><strong id="imageQualityValue">90%</strong></div><input id="imageQuality" type="range" min="0.4" max="1" step="0.05" value="0.9" disabled><p class="image-help-text">Pengaturan kualitas berlaku untuk JPEG dan WebP.</p></div>',
            '</div>',
            '<div class="image-export-actions"><button type="button" id="imageExportButton" class="button-primary image-export-button" disabled>Unduh hasil <svg aria-hidden="true"><use href="#i-arrow"></use></svg></button><button type="button" id="imageClearButton" class="image-clear-button" disabled>Hapus gambar</button></div>',
            '<p class="image-status" id="imageStatus" role="status" aria-live="polite">Pilih gambar untuk memulai. File diproses di browser dan tidak diunggah.</p>',
          '</aside>',
        '</div>',
        '<div class="module-privacy image-privacy-note"><svg aria-hidden="true"><use href="#i-shield"></use></svg><p><strong>Privasi dan batas fitur.</strong> Editor ini berjalan lokal di browser tanpa mengirim gambar ke server. Versi awal mendukung rotasi, pembalikan, pengubahan ukuran, dan konversi PNG/JPEG/WebP. Generasi gambar AI, penghapusan latar, serta analisis gambar berbasis model belum diaktifkan.</p></div>',
        '<footer class="main-footer"><span>© 2026 LOKAL AI <b>·</b> SMALAN</span><span>Local-first by design.</span></footer>',
      '</div>'
    ].join("");
  }

  function bind(root) {
    destroy();
    const get = (id) => root.querySelector("#" + id);
    const fileInput = get("imageFileInput");
    const dropzone = get("imageDropzone");
    const preview = get("imagePreview");
    const previewContainer = get("imagePreviewContainer");
    const toolbar = get("imageToolbar");
    const sourceMeta = get("imageSourceMeta");
    const widthInput = get("imageWidth");
    const heightInput = get("imageHeight");
    const keepRatio = get("imageKeepRatio");
    const formatInput = get("imageFormat");
    const qualityInput = get("imageQuality");
    const qualityValue = get("imageQualityValue");
    const exportButton = get("imageExportButton");
    const clearButton = get("imageClearButton");
    const status = get("imageStatus");

    if (!fileInput || !preview || !status) return;
    state = {
      root,
      file: null,
      image: null,
      sourceUrl: "",
      rotation: 0,
      flipX: false,
      flipY: false,
      busy: false,
      aspectRatio: 1
    };

    function setStatus(message, type) {
      status.textContent = message;
      status.dataset.state = type || "info";
    }

    function orientedSize() {
      if (!state || !state.image) return { width: 0, height: 0 };
      const swap = state.rotation % 180 !== 0;
      return {
        width: swap ? state.image.naturalHeight : state.image.naturalWidth,
        height: swap ? state.image.naturalWidth : state.image.naturalHeight
      };
    }

    function updatePreviewTransform() {
      if (!state || !state.image) return;
      preview.style.transform = "rotate(" + state.rotation + "deg) scaleX(" + (state.flipX ? -1 : 1) + ") scaleY(" + (state.flipY ? -1 : 1) + ")";
      const left = toolbar.querySelector('[data-image-action="flip-x"]');
      const top = toolbar.querySelector('[data-image-action="flip-y"]');
      if (left) left.setAttribute("aria-pressed", state.flipX ? "true" : "false");
      if (top) top.setAttribute("aria-pressed", state.flipY ? "true" : "false");
    }

    function updateQualityState() {
      const isPng = formatInput.value === "image/png";
      qualityInput.disabled = !state.file || state.busy || isPng;
      qualityInput.setAttribute("aria-disabled", qualityInput.disabled ? "true" : "false");
    }

    function setControlsEnabled(enabled) {
      [widthInput, heightInput, keepRatio, formatInput, exportButton, clearButton].forEach((element) => {
        if (element) element.disabled = !enabled || state.busy;
      });
      toolbar.querySelectorAll("button").forEach((button) => { button.disabled = !enabled || state.busy; });
      if (dropzone) dropzone.classList.toggle("has-image", enabled);
      if (toolbar) toolbar.hidden = !enabled;
      if (sourceMeta) sourceMeta.hidden = !enabled;
      if (previewContainer) previewContainer.hidden = !enabled;
      if (dropzone) dropzone.hidden = enabled;
      updateQualityState();
    }

    function resetTransform() {
      if (!state || !state.image) return;
      state.rotation = 0;
      state.flipX = false;
      state.flipY = false;
      widthInput.value = String(state.image.naturalWidth);
      heightInput.value = String(state.image.naturalHeight);
      state.aspectRatio = state.image.naturalWidth / state.image.naturalHeight;
      updatePreviewTransform();
      setStatus("Transformasi dikembalikan ke gambar asli.", "info");
    }

    function clearImage(message) {
      if (!state) return;
      if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
      state.file = null;
      state.image = null;
      state.sourceUrl = "";
      state.rotation = 0;
      state.flipX = false;
      state.flipY = false;
      preview.removeAttribute("src");
      preview.style.transform = "";
      widthInput.value = "0";
      heightInput.value = "0";
      fileInput.value = "";
      setControlsEnabled(false);
      if (get("imageSourceName")) get("imageSourceName").textContent = "Belum ada gambar";
      if (get("imageSourceDimensions")) get("imageSourceDimensions").textContent = "";
      if (get("imageSourceSize")) get("imageSourceSize").textContent = "";
      setStatus(message || "Pilih gambar untuk memulai. File diproses di browser dan tidak diunggah.", "info");
    }

    function loadFile(file) {
      if (!file) return;
      if (!ALLOWED_TYPES.has(file.type)) {
        setStatus("Format tidak didukung. Gunakan file JPEG, PNG, atau WebP.", "error");
        fileInput.value = "";
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setStatus("Ukuran file melebihi batas 20 MB.", "error");
        fileInput.value = "";
        return;
      }
      const candidateUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function () {
        const pixels = image.naturalWidth * image.naturalHeight;
        if (!image.naturalWidth || !image.naturalHeight || pixels > MAX_PIXELS) {
          URL.revokeObjectURL(candidateUrl);
          setStatus("Resolusi gambar terlalu besar atau tidak valid. Batas pemrosesan 40 megapiksel.", "error");
          fileInput.value = "";
          return;
        }
        if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
        state.file = file;
        state.image = image;
        state.sourceUrl = candidateUrl;
        state.rotation = 0;
        state.flipX = false;
        state.flipY = false;
        state.aspectRatio = image.naturalWidth / image.naturalHeight;
        preview.src = candidateUrl;
        widthInput.value = String(image.naturalWidth);
        heightInput.value = String(image.naturalHeight);
        const name = get("imageSourceName");
        const dimensions = get("imageSourceDimensions");
        const size = get("imageSourceSize");
        if (name) name.textContent = file.name;
        if (dimensions) dimensions.textContent = image.naturalWidth + " × " + image.naturalHeight + " px";
        if (size) size.textContent = (file.size / 1024 / 1024).toFixed(2) + " MB";
        setControlsEnabled(true);
        updatePreviewTransform();
        setStatus("Gambar siap diedit. Semua perubahan tetap di perangkat ini.", "success");
        fileInput.value = "";
      };
      image.onerror = function () {
        URL.revokeObjectURL(candidateUrl);
        setStatus("Gambar tidak dapat dibaca oleh browser.", "error");
        fileInput.value = "";
      };
      image.src = candidateUrl;
    }

    function updateDimensions(changed) {
      if (!state.image) return;
      const width = Number(widthInput.value);
      const height = Number(heightInput.value);
      const ratio = state.aspectRatio;
      if (keepRatio.checked && changed === "width" && Number.isFinite(width) && width > 0) {
        heightInput.value = String(Math.max(1, Math.round(width / ratio)));
      } else if (keepRatio.checked && changed === "height" && Number.isFinite(height) && height > 0) {
        widthInput.value = String(Math.max(1, Math.round(height * ratio)));
      }
    }

    function canvasToBlob(canvas, mime, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Browser tidak dapat menyiapkan file hasil."));
        }, mime, quality);
      });
    }

    async function exportImage() {
      const imageState = state;
      if (!imageState || !imageState.image || imageState.busy) return;
      const width = Number(widthInput.value);
      const height = Number(heightInput.value);
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE) {
        setStatus("Lebar dan tinggi harus berupa bilangan bulat 1–8.000 piksel.", "error");
        return;
      }
      if (width * height > MAX_PIXELS) {
        setStatus("Ukuran keluaran melebihi batas 40 megapiksel.", "error");
        return;
      }

      imageState.busy = true;
      setControlsEnabled(true);
      setStatus("Menyiapkan gambar di browser…", "info");
      let orientedCanvas;
      let outputCanvas;
      try {
        const swap = imageState.rotation % 180 !== 0;
        const oriented = {
          width: swap ? imageState.image.naturalHeight : imageState.image.naturalWidth,
          height: swap ? imageState.image.naturalWidth : imageState.image.naturalHeight
        };
        orientedCanvas = document.createElement("canvas");
        orientedCanvas.width = oriented.width;
        orientedCanvas.height = oriented.height;
        const orientedContext = orientedCanvas.getContext("2d", { alpha: true });
        if (!orientedContext) throw new Error("Canvas 2D tidak tersedia pada browser ini.");
        orientedContext.translate(oriented.width / 2, oriented.height / 2);
        orientedContext.scale(imageState.flipX ? -1 : 1, imageState.flipY ? -1 : 1);
        orientedContext.rotate(imageState.rotation * Math.PI / 180);
        orientedContext.drawImage(imageState.image, -imageState.image.naturalWidth / 2, -imageState.image.naturalHeight / 2);

        outputCanvas = document.createElement("canvas");
        outputCanvas.width = width;
        outputCanvas.height = height;
        const outputContext = outputCanvas.getContext("2d", { alpha: true });
        if (!outputContext) throw new Error("Canvas 2D tidak tersedia pada browser ini.");
        const mime = formatInput.value;
        if (mime === "image/jpeg") {
          outputContext.fillStyle = "#ffffff";
          outputContext.fillRect(0, 0, width, height);
        }
        outputContext.drawImage(orientedCanvas, 0, 0, width, height);
        const quality = Number(qualityInput.value);
        const blob = await canvasToBlob(outputCanvas, mime, mime === "image/png" ? undefined : quality);
        const extension = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
        const baseName = imageState.file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "gambar";
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = baseName + "-edited." + extension;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        setStatus("File berhasil disiapkan: " + width + " × " + height + " px · " + extension.toUpperCase() + ".", "success");
      } catch (error) {
        setStatus(error && error.message ? error.message : "Gagal mengekspor gambar.", "error");
      } finally {
        if (orientedCanvas) { orientedCanvas.width = 0; orientedCanvas.height = 0; }
        if (outputCanvas) { outputCanvas.width = 0; outputCanvas.height = 0; }
        imageState.busy = false;
        if (state === imageState) setControlsEnabled(Boolean(imageState.image));
      }
    }

    fileInput.addEventListener("change", () => loadFile(fileInput.files && fileInput.files[0]));
    dropzone.addEventListener("dragover", (event) => { event.preventDefault(); dropzone.classList.add("is-dragging"); });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      loadFile(file);
    });
    toolbar.querySelectorAll("[data-image-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!state.image || state.busy) return;
        const action = button.dataset.imageAction;
        if (action === "rotate-left" || action === "rotate-right") {
          const oldWidth = Number(widthInput.value);
          const oldHeight = Number(heightInput.value);
          state.rotation = (state.rotation + (action === "rotate-right" ? 90 : 270)) % 360;
          widthInput.value = String(oldHeight);
          heightInput.value = String(oldWidth);
          state.aspectRatio = Number(widthInput.value) / Number(heightInput.value);
          updatePreviewTransform();
        } else if (action === "flip-x") {
          state.flipX = !state.flipX;
          updatePreviewTransform();
        } else if (action === "flip-y") {
          state.flipY = !state.flipY;
          updatePreviewTransform();
        } else if (action === "reset") {
          resetTransform();
          return;
        }
        setStatus("Pratinjau diperbarui. Unduh hasil untuk menyimpan perubahan.", "info");
      });
    });
    widthInput.addEventListener("input", () => updateDimensions("width"));
    heightInput.addEventListener("input", () => updateDimensions("height"));
    formatInput.addEventListener("change", updateQualityState);
    qualityInput.addEventListener("input", () => { qualityValue.textContent = Math.round(Number(qualityInput.value) * 100) + "%"; });
    exportButton.addEventListener("click", exportImage);
    clearButton.addEventListener("click", () => clearImage());
    setControlsEnabled(false);
  }

  function destroy() {
    if (state && state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
    state = null;
  }

  global.LokalAIImageStudio = Object.freeze({ render, bind, destroy });
})(window);
