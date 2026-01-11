const app = document.getElementById('app');

let state = {
  currentScreen: 'role',
  role: '',
  photo: null,
  photoBase64: null,
  style: 'Painted Hype',
  email: '',
  consent: false,
  generatedImage: null,
  generatedImageName: null
};

// Header con logo Cloud9 que aparece en todas las pantallas
const headerComponent = () => `
  <header class="cloud9-header">
    <img src="/cloud9-logo.svg" alt="Cloud9" class="cloud9-logo">
  </header>
`;

const screens = {
  role: () => `
    ${headerComponent()}
    <div class="screen">
      <h1 class="app-title">🎮 Roster Moment</h1>
      <p class="subtitle">Join the Team</p>
      <h2>Select your Role</h2>
      <div class="grid">
        <button onclick="setRole('Top')">🛡️ Top Lane</button>
        <button onclick="setRole('Jungle')">🌿 Jungler</button>
        <button onclick="setRole('Mid')">🔮 Mid Lane</button>
        <button onclick="setRole('ADC')">🏹 Attack Damage</button>
        <button onclick="setRole('Support')">✨ Support</button>
      </div>
    </div>
  `,
  photo: () => `
    ${headerComponent()}
    <div class="screen">
      <h2>Upload your Photo</h2>
      <p class="subtitle-dim">Show us your game face</p>
      <div style="position: relative;">
        <input type="file" accept="image/*" capture="user" id="photoInput" onchange="handlePhoto(event)" style="opacity: 0; position: absolute; z-index: -1;">
        <button onclick="document.getElementById('photoInput').click()" id="uploadBtn" class="upload-btn">📸 Take / Select Photo</button>
      </div>
      <div id="previewContainer"></div>
      <button onclick="nextScreen()" id="nextBtn" disabled class="primary-btn">Continue ➔</button>
      <button class="secondary-btn" onclick="prevScreen()">Back to Roles</button>
    </div>
  `,
  style: () => {
    return `
    ${headerComponent()}
    <div class="screen">
      <h2>Finalize Your Poster</h2>
      <p class="subtitle-dim">Choose your artistic style</p>
      <div class="grid">
        <button class="style-btn" 
                id="style-Painted-Hype" 
                onclick="window.handleStyleSelection('Painted Hype', this)">🎨 Painted Hype</button>
        <button class="style-btn" 
                id="style-Hype-Match-Day" 
                onclick="window.handleStyleSelection('Hype Match Day', this)">⚡ Hype Match Day</button>
        <button class="style-btn" 
                id="style-Social-Media-Avatar" 
                onclick="window.handleStyleSelection('Social Media Avatar', this)">👤 Pro Avatar</button>
      </div>
      
      <div class="email-input-container">
        <label for="emailInput" class="email-label">Where should we send your poster?</label>
        <input type="email" id="emailInput" placeholder="Enter your email address" value="${state.email}" oninput="handleEmail(event)">
        
        <label class="consent-label">
          <input type="checkbox" id="consentCheckbox" ${state.consent ? 'checked' : ''} onchange="handleConsent(event)">
          <span class="consent-text">Acepto recibir mi poster por email y comunicaciones de Cloud9</span>
        </label>
      </div>
      
      <button onclick="nextScreen()" class="generate-btn" ${!state.consent ? 'disabled' : ''}>Generate Result 🏆</button>
      <button class="secondary-btn" onclick="prevScreen()">Change Photo</button>
    </div>
  `;
  },
  generating: () => `
    ${headerComponent()}
    <div class="screen generating-screen">
      <div class="loader-container">
        <div class="loader"></div>
        <div class="loader-glow"></div>
      </div>
      <div class="generating-text">Initializing AI</div>
      <p class="subtitle-dim">Processing visual blueprints...</p>
      <div id="status-log" class="status-log">
        Establishing secure uplink...
      </div>
    </div>
  `,
  result: () => {
    const personality = {
      Top: "The unwavering fortress. Your team's first line.",
      Jungle: "Master of the shadows. You control the tempo.",
      Mid: "The playmaker. All eyes on you.",
      ADC: "Precision incarnate. Every shot counts.",
      Support: "The silent hero. You lift the whole team."
    };

    const roleEmojis = {
      Top: "🛡️",
      Jungle: "🌿",
      Mid: "🔮",
      ADC: "🏹",
      Support: "✨"
    };

    const qrUrl = state.generatedImage && !state.generatedImage.startsWith('data:')
      ? state.generatedImage
      : `https://cloud9-roster-moment.onrender.com/generated/${state.generatedImageName || ''}`;

    return `
    ${headerComponent()}
    <div class="screen">
      <h1 class="result-title">🏆 YOUR ROSTER MOMENT</h1>
      <div class="result-card">
        ${state.generatedImage
        ? `<img src="${state.generatedImage}" class="photo-preview-large" alt="Póster generado" onclick="window.zoomImage()">`
        : state.photo
          ? `<img src="${state.photo}" class="photo-preview-large" alt="Previsualización de foto">`
          : '<div class="placeholder-img">No Photo</div>'}
        <h2 class="role-display">${roleEmojis[state.role] || ''} ${state.role.toUpperCase()}</h2>
        <p class="style-name">${state.style}</p>
        <p class="personality-msg">"${personality[state.role] || ''}"</p>
      </div>
      
      <!-- Modal para zoom -->
      <div id="imageModal" class="image-modal" onclick="window.closeZoom()">
        <img src="${state.generatedImage || ''}" class="modal-content" id="modalImg" alt="Póster ampliado">
        <button class="close-modal" onclick="window.closeZoom()">Close</button>
      </div>

      ${state.generatedImage ? `
        <div class="qr-section">
          <p class="qr-label">📱 Scan to get your image</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" alt="QR Code" class="qr-image">
        </div>
      ` : ''}
      <div class="email-sent">📧 Registered: ${state.email}</div>
      <button onclick="resetApp()" class="create-another-btn">🔄 Create Another</button>
    </div>
  `;
  }
};

function render() {
  const dots = document.querySelectorAll('.dot');
  const screenKeys = Object.keys(screens);
  const currentIndex = screenKeys.indexOf(state.currentScreen);

  app.innerHTML = screens[state.currentScreen]();

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentIndex);
  });
}

window.setRole = (role) => {
  state.role = role;
  nextScreen();
};

window.handlePhoto = (event) => {
  const file = event.target.files[0];
  if (file) {
    // Guardar URL para preview
    state.photo = URL.createObjectURL(file);
    const container = document.getElementById('previewContainer');
    container.innerHTML = `<img src="${state.photo}" class="photo-preview" alt="Preview">`;
    document.getElementById('nextBtn').disabled = false;

    // Convertir a base64 para enviar al servidor
    const reader = new FileReader();
    reader.onloadend = () => {
      // Guardar el base64 completo (incluye el prefijo data:image/...)
      state.photoBase64 = reader.result;
    };
    reader.readAsDataURL(file);
  }
};

window.setStyle = (style) => {
  state.style = style;
  nextScreen();
};

window.handleStyleSelection = (style, element) => {
  state.style = style;

  // Actualización parcial del DOM para evitar el "flash" de render()
  const btns = document.querySelectorAll('.style-btn');
  btns.forEach(btn => btn.classList.remove('selected'));

  if (element) {
    element.classList.add('selected');
  }
};

window.handleEmail = (event) => {
  state.email = event.target.value;
};

window.handleConsent = (event) => {
  state.consent = event.target.checked;
  // Actualizar el estado del botón sin re-renderizar toda la pantalla
  const generateBtn = document.querySelector('.generate-btn');
  if (generateBtn) {
    generateBtn.disabled = !state.consent;
  }
};

window.zoomImage = () => {
  const modal = document.getElementById('imageModal');
  if (modal) modal.classList.add('active');
};

window.closeZoom = () => {
  const modal = document.getElementById('imageModal');
  if (modal) modal.classList.remove('active');
};

// Configuración de la API - URL de Render para producción
const API_URL = 'https://cloud9-roster-moment.onrender.com';

window.nextScreen = async () => {
  const screenKeys = Object.keys(screens);
  const currentIndex = screenKeys.indexOf(state.currentScreen);

  // El trigger ahora es la pantalla 'style' (donde está el botón "Ver Resultado")
  if (state.currentScreen === 'style') {
    state.currentScreen = 'generating';
    render();

    const statusLog = document.getElementById('status-log');

    try {
      if (statusLog) statusLog.innerText = `Connecting to the AI server...`;

      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: state.role,
          style: state.style,
          email: state.email,
          consent: state.consent,
          photo: state.photoBase64
        })
      });

      if (statusLog) statusLog.innerText = 'Receiving AI response...';

      if (!response.ok) {
        throw new Error(`Request error: ${response.status}`);
      }

      const data = await response.json();
      if (statusLog) statusLog.innerText = 'Image generated successfully!';

      if (data.imageUrl) {
        state.generatedImage = data.imageUrl;
      }

      // Fallback: Si el servidor envía la imagen en Base64, usarla (más fiable en producción)
      if (data.imageBase64) {
        state.generatedImage = `data:image/jpeg;base64,${data.imageBase64}`;
      }

      if (data.imageName) {
        state.generatedImageName = data.imageName;
      }
    } catch (error) {
      console.error('Error detallado:', error);
      if (statusLog) statusLog.innerText = `❌ Error: ${error.message}`;
      alert(`Error de conexión: ${error.message}`);
    } finally {
      // Pequeña espera para que se vea el mensaje de éxito antes de cambiar
      setTimeout(() => {
        state.currentScreen = 'result';
        render();
      }, 1000);
    }
  } else if (currentIndex < screenKeys.length - 1) {
    state.currentScreen = screenKeys[currentIndex + 1];
    render();
  }
};

window.prevScreen = () => {
  const screenKeys = Object.keys(screens);
  const currentIndex = screenKeys.indexOf(state.currentScreen);
  if (currentIndex > 0) {
    state.currentScreen = screenKeys[currentIndex - 1];
    render();
  }
};

window.resetApp = () => {
  state = {
    currentScreen: 'role',
    role: '',
    photo: null,
    photoBase64: null,
    style: 'Painted Hype',
    email: '',
    consent: false,
    generatedImage: null,
    generatedImageName: null
  };
  render();
};

// Initial render
render();

// Registro del Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registrado'))
      .catch(err => console.log('Fallo al registrar Service Worker', err));
  });
}

// Lógica para el botón de instalación (PWA)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  console.log('App ready to be installed');
  // You could store the event here if you wanted to show a custom install button later
});
