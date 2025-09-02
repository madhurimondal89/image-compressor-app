const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/compressed', express.static(path.join(__dirname, 'compressed')));

// --- Multer-এর জন্য উন্নত স্টোরেজ কনফিগারেশন ---
const storage = multer.diskStorage({
    // গন্তব্য ফোল্ডার সেট করা
    destination: function (req, file, cb) {
        cb(null, 'compressed/'); // ফাইলগুলো সরাসরি 'compressed' ফোল্ডারে সেভ হবে
    },
    // ফাইলের নাম সেট করা
    filename: function (req, file, cb) {
        // একটি ইউনিক নাম তৈরি করা: বর্তমান সময় + মূল ফাইলের নাম
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname) + '.jpeg');
    }
});

// নতুন স্টোরেজ কনফিগারেশন দিয়ে multer চালু করা
const upload = multer({ storage: storage });
// ----------------------------------------------------

// Create 'compressed' directory if it doesn't exist
const compressedDir = 'compressed';
if (!fs.existsSync(compressedDir)) {
    fs.mkdirSync(compressedDir);
}

// --- API রুটটি এখন অনেক সহজ হয়ে গেছে ---
app.post('/save-image', upload.single('image'), (req, res) => {
    // multer এখন স্বয়ংক্রিয়ভাবে ফাইল সেভ করছে, তাই আমাদের আর কিছু করার নেই
    if (!req.file) {
        return res.status(400).json({ error: 'No image file was uploaded.' });
    }

    try {
        // যেহেতু ফাইল সরাসরি সঠিক জায়গায় সেভ হয়েছে, আমরা শুধু তার তথ্য পাঠিয়ে দেব
        const finalPath = `/compressed/${req.file.filename}`;
        const finalSize = req.file.size;

        res.status(200).json({
            message: 'Image saved successfully on the server!',
            finalPath: finalPath,
            finalSize: finalSize
        });

    } catch (error) {
        console.error('Error after saving image:', error);
        res.status(500).json({ error: 'Server failed to process the saved image.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running successfully on http://localhost:${PORT}`);
});