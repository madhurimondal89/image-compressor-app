const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const fileListSection = document.getElementById('file-list-section');
const fileList = document.getElementById('file-list');
const qualityControl = document.getElementById('quality-control');
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
const actionButtons = document.getElementById('action-buttons');
const downloadAllBtn = document.getElementById('download-all-btn');
const resetBtn = document.getElementById('reset-btn');

const MAX_FILES = 20;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB per file (safe for browser memory)

let selectedFiles = [];
let compressedCache = new Map(); // index -> { quality, blob, filename }

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// File input events
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > MAX_FILES) {
        alert(`You can upload a maximum of ${MAX_FILES} files at a time.`);
        return;
    }

    const oversized = imageFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
        alert(`Some files exceed the 25MB limit and were skipped: ${oversized.map(f => f.name).join(', ')}`);
    }

    selectedFiles = imageFiles.filter(file => file.size <= MAX_FILE_SIZE);
    if (selectedFiles.length === 0) return;

    compressedCache.clear();
    uploadArea.style.display = 'none';
    fileListSection.style.display = 'block';
    qualityControl.style.display = 'block';
    actionButtons.style.display = 'flex';

    renderFileList();
    updateAllPreviews(parseInt(qualitySlider.value, 10));
}

function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.id = `file-item-${index}`;

        fileItem.innerHTML = `
            <img class="file-item-thumbnail" id="thumbnail-${index}" src="" alt="thumbnail">
            <div class="file-item-details">
                <div class="file-item-name">${file.name}</div>
                <div class="file-item-size">
                    <span id="original-size-${index}">${formatBytes(file.size)}</span>
                    <span class="arrow">→</span>
                    <span class="compressed" id="compressed-size-${index}"></span>
                </div>
            </div>
            <div class="file-item-status">
                <div class="loader" id="loader-${index}"></div>
            </div>
            <button class="download-single-btn" data-index="${index}">Download</button>
        `;
        fileList.appendChild(fileItem);

        const reader = new FileReader();
        reader.onload = (e) => {
            const thumb = document.getElementById(`thumbnail-${index}`);
            if (thumb) thumb.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}

function canvasToBlob(canvas, mimeType, qualityRatio) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas compression failed.'));
            },
            mimeType,
            qualityRatio
        );
    });
}

/**
 * Compress an image 100% client-side using HTML5 Canvas.
 * Preserves JPEG, WebP, and transparent PNG formats.
 */
async function compressImageInBrowser(file, quality) {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    let outputMime = 'image/jpeg';
    let ext = 'jpeg';

    if (file.type === 'image/png') {
        outputMime = 'image/png';
        ext = 'png';

        // Quantize color channels slightly based on quality so PNG DEFLATE compresses smaller
        // while preserving alpha transparency.
        if (quality < 100) {
            const step = Math.max(2, Math.round((100 - quality) / 4));
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.round(data[i] / step) * step;
                data[i + 1] = Math.round(data[i + 1] / step) * step;
                data[i + 2] = Math.round(data[i + 2] / step) * step;
            }
            ctx.putImageData(imageData, 0, 0);
        }
    } else if (file.type === 'image/webp') {
        outputMime = 'image/webp';
        ext = 'webp';
    }

    const qualityRatio = Math.min(1, Math.max(0.05, quality / 100));
    let blob = await canvasToBlob(canvas, outputMime, qualityRatio);

    // Never return a larger file than the original
    if (blob.size >= file.size) {
        blob = file;
        ext = file.name.split('.').pop() || ext;
    }

    return {
        blob,
        filename: `${baseName}-q${quality}.${ext}`
    };
}

async function getCompressedResult(index, quality) {
    const cached = compressedCache.get(index);
    if (cached && cached.quality === quality) {
        return { blob: cached.blob, filename: cached.filename };
    }
    const result = await compressImageInBrowser(selectedFiles[index], quality);
    compressedCache.set(index, { quality, ...result });
    return result;
}

async function updateAllPreviews(quality) {
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const loader = document.getElementById(`loader-${i}`);
        const compressedSizeEl = document.getElementById(`compressed-size-${i}`);
        if (!loader || !compressedSizeEl) continue;

        loader.style.display = 'block';
        compressedSizeEl.textContent = 'Compressing...';

        try {
            const { blob } = await getCompressedResult(i, quality);
            const savedPct = Math.round(((file.size - blob.size) / file.size) * 100);
            const pctText = savedPct > 0 ? ` (-${savedPct}%)` : ' (0%)';
            compressedSizeEl.textContent = `${formatBytes(blob.size)}${pctText}`;
        } catch (error) {
            console.error(`Error compressing ${file.name}:`, error);
            compressedSizeEl.textContent = 'Error';
        } finally {
            loader.style.display = 'none';
        }
    }
}

let debounceTimer;
qualitySlider.addEventListener('input', (e) => {
    const quality = parseInt(e.target.value, 10);
    qualityValue.textContent = `${quality}%`;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (selectedFiles.length > 0) updateAllPreviews(quality);
    }, 250);
});

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

fileList.addEventListener('click', async (e) => {
    if (e.target && e.target.classList.contains('download-single-btn')) {
        const button = e.target;
        const index = parseInt(button.dataset.index, 10);
        const quality = parseInt(qualitySlider.value, 10);

        button.disabled = true;
        button.textContent = '...';

        try {
            const { blob, filename } = await getCompressedResult(index, quality);
            triggerDownload(blob, filename);
        } catch (error) {
            console.error(error);
            alert(`Could not download ${selectedFiles[index].name}.`);
        } finally {
            button.disabled = false;
            button.textContent = 'Download';
        }
    }
});

downloadAllBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    const quality = parseInt(qualitySlider.value, 10);
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = 'Processing...';

    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await window.showDirectoryPicker();
            for (let i = 0; i < selectedFiles.length; i++) {
                const { blob, filename } = await getCompressedResult(i, quality);
                const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            }
            alert('All files downloaded successfully!');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error saving files:', error);
                alert('An error occurred while saving the files.');
            }
        } finally {
            downloadAllBtn.disabled = false;
            downloadAllBtn.textContent = 'Download All';
        }
    } else {
        alert("Your browser doesn't support direct folder access. Files will be downloaded one by one.");
        for (let i = 0; i < selectedFiles.length; i++) {
            try {
                const { blob, filename } = await getCompressedResult(i, quality);
                triggerDownload(blob, filename);
                await new Promise(resolve => setTimeout(resolve, 400));
            } catch (error) {
                console.error(`Failed to download ${selectedFiles[i].name}`, error);
            }
        }
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = 'Download All';
    }
});

resetBtn.addEventListener('click', resetUI);

function resetUI() {
    selectedFiles = [];
    compressedCache.clear();
    fileInput.value = '';
    uploadArea.style.display = 'block';
    fileListSection.style.display = 'none';
    qualityControl.style.display = 'none';
    actionButtons.style.display = 'none';

    qualitySlider.value = 80;
    qualityValue.textContent = '80%';
    fileList.innerHTML = '';
}
