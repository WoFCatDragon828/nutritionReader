const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const scanBtn = document.getElementById('scanBtn');
const imageInput = document.getElementById('imageInput');
const output = document.getElementById('outputText');
const speakBtn = document.getElementById('speakBtn');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');

let lastParsedData = null;
let currentFacingMode = 'environment'; // default to back camera
let currentStream = null;

// Function to start the camera with given facing mode
async function startCamera(facingMode) {
  // Stop any existing camera stream
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  try {
    const constraints = {
      video: {
        facingMode: { ideal: facingMode }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    currentStream = stream;
  } catch (error) {
    console.error("Camera initialization failed:", error);
    output.innerHTML = "🚫 Unable to access the camera. Please check browser permissions.";
  }
}

// Initialize camera on page load
startCamera(currentFacingMode);

// Toggle camera button click event
toggleCameraBtn.addEventListener('click', () => {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  startCamera(currentFacingMode);
});

// Scan from camera button click event
scanBtn.addEventListener('click', () => {
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataURL = canvas.toDataURL();
  runOCR(dataURL);
});

// Scan from uploaded image
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    runOCR(reader.result);
  };
  reader.readAsDataURL(file);
});

// Run OCR and parse nutrition info
async function runOCR(dataURL) {
  output.innerHTML = 'Scanning...';

  const { data: { text } } = await Tesseract.recognize(dataURL, 'eng');
  output.innerHTML = `<pre>${text}</pre>`;

  const parsed = parseNutritionInfo(text);
  displayParsedInfo(parsed);

  lastParsedData = parsed;
  speakBtn.style.display = 'inline-block';
}

// Nutrition info parser
function parseNutritionInfo(text) {
  const lines = text.split('\n').map(line => line.toLowerCase().trim());
  const data = {};

  const fields = {
    calories: /calories[^0-9]*([\d]+)/,
    totalFat: /total fat[^0-9]*([\d.]+)/,
    saturatedFat: /saturated fat[^0-9]*([\d.]+)/,
    transFat: /trans fat[^0-9]*([\d.]+)/,
    cholesterol: /cholesterol[^0-9]*([\d.]+)/,
    sodium: /sodium[^0-9]*([\d.]+)/,
    totalCarbs: /total carbohydrate[^0-9]*([\d.]+)/,
    sugars: /sugars[^0-9]*([\d.]+)/,
    protein: /protein[^0-9]*([\d.]+)/,
  };

  for (const [key, regex] of Object.entries(fields)) {
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        data[key] = match[1];
        break;
      }
    }
  }

  return data;
}

// Display parsed info
function displayParsedInfo(data) {
  let html = '<h3>Parsed Nutrition Info:</h3><ul>';

  for (const [key, value] of Object.entries(data)) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    html += `<li><strong>${label}:</strong> ${value}</li>`;
  }

  html += '</ul>';
  output.innerHTML += html;
}

// Speak parsed info when button is clicked
speakBtn.addEventListener('click', () => {
  if (lastParsedData) {
    speakParsedInfo(lastParsedData);
  }
});

function speakParsedInfo(data) {
  if (!window.speechSynthesis) return;

  let message = "Here is the nutrition information. ";
  for (const [key, value] of Object.entries(data)) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    message += `${label}: ${value}. `;
  }

  const utterance = new SpeechSynthesisUtterance(message);
  speechSynthesis.speak(utterance);
}

const contrastToggle = document.getElementById('contrastToggle');

contrastToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});
