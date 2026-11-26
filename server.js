const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

const app = express();
app.disable('x-powered-by');

const port = process.env.PORT || 3000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/tiff'
]);

app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        files: 20,
        fileSize: MAX_FILE_SIZE_BYTES
    },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Please upload JPEG, PNG, WebP, GIF, AVIF, or TIFF images.'));
        }
    }
});

/**
 * Compress an image buffer while preserving its original format where supported
 * (keeping PNG transparency, WebP, etc.) and falling back to JPEG otherwise.
 */
async function compressImage(buffer, mimetype, quality) {
    const pipeline = sharp(buffer).rotate(); // auto-orient based on EXIF

    if (mimetype === 'image/png') {
        const compressedBuffer = await pipeline
            .png({ quality: quality, compressionLevel: 9, palette: true })
            .toBuffer();
        return { buffer: compressedBuffer, ext: 'png', contentType: 'image/png' };
    }

    if (mimetype === 'image/webp') {
        const compressedBuffer = await pipeline
            .webp({ quality: quality })
            .toBuffer();
        return { buffer: compressedBuffer, ext: 'webp', contentType: 'image/webp' };
    }

    if (mimetype === 'image/avif') {
        const compressedBuffer = await pipeline
            .avif({ quality: quality })
            .toBuffer();
        return { buffer: compressedBuffer, ext: 'avif', contentType: 'image/avif' };
    }

    const compressedBuffer = await pipeline
        .jpeg({ quality: quality, mozjpeg: true })
        .toBuffer();
    return { buffer: compressedBuffer, ext: 'jpeg', contentType: 'image/jpeg' };
}

// Preview route: returns original and compressed byte sizes
app.post('/preview', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    try {
        const quality = parseInt(req.body.quality, 10) || 80;
        if (isNaN(quality) || quality < 1 || quality > 100) {
            return res.status(400).json({ error: 'Invalid quality value.' });
        }
        const originalSize = req.file.size;
        const { buffer: compressedImageBuffer } = await compressImage(
            req.file.buffer,
            req.file.mimetype,
            quality
        );

        res.json({
            originalSize: originalSize,
            compressedSize: compressedImageBuffer.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error processing image for preview.' });
    }
});

// Single-file compression download route
app.post('/compress-single', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const quality = parseInt(req.body.quality, 10) || 80;
    if (isNaN(quality) || quality < 1 || quality > 100) {
        return res.status(400).send('Invalid quality value.');
    }
    try {
        const originalName = path.parse(req.file.originalname).name;
        const { buffer: compressedImageBuffer, ext, contentType } = await compressImage(
            req.file.buffer,
            req.file.mimetype,
            quality
        );
        const compressedFileName = `${originalName}-q${quality}.${ext}`;
        res.set('Content-Disposition', `attachment; filename="${compressedFileName}"`);
        res.set('Content-Type', contentType);
        res.send(compressedImageBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error compressing the image.');
    }
});

// Multer & upload error handler
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File exceeds the 10MB size limit.' });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message || 'Upload error.' });
    }
    next();
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
