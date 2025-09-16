const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// >>--- Step 1: রুট ফোল্ডারটিকে স্ট্যাটিক ফাইল সার্ভার হিসেবে সেট করা ---<<
// এর ফলে, Express নিজে থেকেই index.html, style.css (যদি থাকে), ইত্যাদি খুঁজে নেবে।
app.use(express.static(__dirname));

// >>--- Step 2: যেকোনো আনম্যাচড রুটের জন্য index.html দেখানো ---<<
// এটি একটি ভালো অভ্যাস, বিশেষ করে Single Page Application (SPA) এর জন্য।
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running successfully on http://localhost:${PORT}`);
});