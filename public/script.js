// DOM এলিমেন্টগুলো (অপরিবর্তিত)
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

let selectedFiles = [];

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// ফাইল ইনপুট ইভেন্ট (অপরিবর্তিত)
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    // পরিবর্তন: এখানে ৫ এর বদলে ২০ করা হয়েছে
    if (fileArray.length > 20) {
        alert('You can upload a maximum of 20 files at a time.');
        return;
    }
    selectedFiles = fileArray;
    if (selectedFiles.length === 0) return;
    
    uploadArea.style.display = 'none';
    fileListSection.style.display = 'block';
    qualityControl.style.display = 'block';
    actionButtons.style.display = 'flex';
    
    renderFileList();
    updateAllPreviews(qualitySlider.value);
}

// renderFileList, updateAllPreviews, debounceTimer (সব অপরিবর্তিত)
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
        reader.onload = (e) => { document.getElementById(`thumbnail-${index}`).src = e.target.result; };
        reader.readAsDataURL(file);
    });
}

async function updateAllPreviews(quality) {
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const loader = document.getElementById(`loader-${i}`);
        const compressedSizeEl = document.getElementById(`compressed-size-${i}`);
        
        loader.style.display = 'block';
        compressedSizeEl.textContent = 'Compressing...';

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('quality', quality);
            const response = await fetch('/preview', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Preview failed');
            const data = await response.json();
            compressedSizeEl.textContent = formatBytes(data.compressedSize);
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            compressedSizeEl.textContent = 'Error';
        } finally {
            loader.style.display = 'none';
        }
    }
}

let debounceTimer;
qualitySlider.addEventListener('input', (e) => {
    const quality = e.target.value;
    qualityValue.textContent = `${quality}%`;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (selectedFiles.length > 0) updateAllPreviews(quality);
    }, 500);
});

// ডাউনলোড ফাংশনগুলো (অপরিবর্তিত)
async function getCompressedBlob(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('quality', qualitySlider.value);
    
    const response = await fetch('/compress-single', { method: 'POST', body: formData });
    if (!response.ok) {
        throw new Error(`Failed to compress ${file.name}`);
    }
    
    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `${file.name.split('.')[0]}-compressed.jpeg`;
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch && filenameMatch.length > 1) filename = filenameMatch[1];
    }
    
    return { blob, filename };
}

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
        const index = parseInt(button.dataset.index);
        const file = selectedFiles[index];

        button.disabled = true;
        button.textContent = '...';

        try {
            const { blob, filename } = await getCompressedBlob(file);
            triggerDownload(blob, filename);
        } catch (error) {
            console.error(error);
            alert(`Could not download ${file.name}.`);
        } finally {
            button.disabled = false;
            button.textContent = 'Download';
        }
    }
});

downloadAllBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = 'Processing...';

    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const savePromises = selectedFiles.map(async (file) => {
                const { blob, filename } = await getCompressedBlob(file);
                const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            });
            await Promise.all(savePromises);
            alert('All files downloaded successfully!');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error saving files:", error);
                alert("An error occurred while saving the files.");
            }
        } finally {
            downloadAllBtn.disabled = false;
            downloadAllBtn.textContent = 'Download All';
        }
    } else {
        alert("Your browser doesn't support direct folder access. Files will be downloaded one by one.");
        for (const file of selectedFiles) {
            try {
                const { blob, filename } = await getCompressedBlob(file);
                triggerDownload(blob, filename);
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Failed to download ${file.name}`, error);
            }
        }
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = 'Download All';
    }
});

// রিসেট ফাংশন (অপরিবর্তিত)
resetBtn.addEventListener('click', resetUI);

function resetUI() {
    selectedFiles = [];
    fileInput.value = '';
    uploadArea.style.display = 'block';
    fileListSection.style.display = 'none';
    qualityControl.style.display = 'none';
    actionButtons.style.display = 'none';
    
    qualitySlider.value = 80;
    qualityValue.textContent = '80%';
    fileList.innerHTML = '';
}