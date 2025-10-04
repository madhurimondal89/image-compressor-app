const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { files: 20 } // পরিবর্তন: এখানে ৫ এর বদলে ২০ করা হয়েছে
});

// preview রুট (অপরিবর্তিত)
app.post('/preview', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    try {
        const quality = parseInt(req.body.quality) || 80;
        if (isNaN(quality) || quality < 1 || quality > 100) {
            return res.status(400).json({ error: 'Invalid quality value.' });
        }
        const originalSize = req.file.size;
        const compressedImageBuffer = await sharp(req.file.buffer)
            .jpeg({ quality: quality })
            .toBuffer();
        const compressedSize = compressedImageBuffer.length;
        
        res.json({
            originalSize: originalSize,
            compressedSize: compressedSize
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error processing image for preview.' });
    }
});

// compress-single রুট (অপরিবর্তিত)
app.post('/compress-single', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const quality = parseInt(req.body.quality) || 80;
    if (isNaN(quality) || quality < 1 || quality > 100) {
        return res.status(400).send('Invalid quality value.');
    }
    try {
        const originalName = path.parse(req.file.originalname).name;
        const compressedFileName = `${originalName}-q${quality}.jpeg`;
        const compressedImageBuffer = await sharp(req.file.buffer)
            .jpeg({ quality: quality })
            .toBuffer();
        res.set('Content-Disposition', `attachment; filename="${compressedFileName}"`);
        res.set('Content-Type', 'image/jpeg');
        res.send(compressedImageBuffer);
    } catch (error)
    {
        console.error(error);
        res.status(500).send('Error compressing the image.');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});