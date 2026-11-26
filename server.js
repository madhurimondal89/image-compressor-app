const express = require('express');
const path = require('path');

const app = express();
app.disable('x-powered-by');

const port = process.env.PORT || 3000;

// Serve static frontend files; all image compression runs client-side in the browser.
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
