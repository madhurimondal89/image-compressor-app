# Image Compressor Web App

A clean, responsive web application for client-side and server-side image compression. Built with Node.js, Express, and the Sharp image processing library.

🌐 **Live Demo:** [https://image-compressor.imagecompress.in](https://image-compressor.imagecompress.in/)

---

## Highlights

- **Fast Processing**: Uses Sharp for high-speed JPEG conversion and compression.
- **Batch Upload**: Select and process up to 20 images at the same time.
- **Real-Time Size Preview**: View original vs estimated compressed size before downloading.
- **Custom Quality Slider**: Adjust compression levels (1-100) dynamically.
- **Drag and Drop**: Upload files easily with drag-and-drop or file picker.
- **Responsive Interface**: Clean CSS UI that adapts well across screen sizes.

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Processing**: Sharp, Multer (memory storage)
- **Frontend**: HTML5, Vanilla JavaScript, CSS3

---

## Getting Started

### Prerequisites

- Node.js (version 18 or newer recommended)
- npm or yarn

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/madhurimondal89/image-compressor-app.git
   cd image-compressor-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## Project Structure

```
image-compressor/
├── public/              # Static frontend assets
│   ├── index.html       # Web interface structure
│   ├── style.css        # Layout styling
│   ├── script.js       # Client interaction & preview logic
│   └── ...
├── server.js            # Express server & Sharp endpoints
├── package.json         # Project configuration & dependencies
└── README.md            # Documentation
```

---

## API Endpoints

- `POST /preview`: Generates preview metadata (original size vs compressed size) for a chosen quality level.
- `POST /compress-single`: Receives an uploaded image file, applies quality settings via Sharp, and returns the compressed JPEG for download.

---

## Contributing

Contributions, feedback, and pull requests are welcome. Feel free to open an issue to suggest improvements or report bugs.

---

## License

This project is licensed under the MIT License.
