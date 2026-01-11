const app = document.getElementById('app');

let state = {
  currentScreen: 'role',
  role: '',
  photo: null,
  photoBase64: null,
  style: 'Painted Hype',
  email: '',
  generatedImage: null
};

const screens = {
  role: () => `
    <div class="screen">
      <h1>🎮 Roster Moment</h1>
      <h2>Selecciona tu Rol</h2>
      <div class="grid">
        <button onclick="setRole('Top')">🛡️ Top</button>
        <button onclick="setRole('Jungle')">🌿 Jungle</button>
        <button onclick="setRole('Mid')">🔮 Mid</button>
        <button onclick="setRole('ADC')">🏹 ADC</button>
        <button onclick="setRole('Support')">✨ Support</button>
      </div>
    </div>
  `,
  photo: () => `
    <div class="screen">
      <h2>Sube tu Foto</h2>
      <input type="file" accept="image/*" capture="user" id="photoInput" onchange="handlePhoto(event)">
      <div id="previewContainer"></div>
      <button onclick="nextScreen()" id="nextBtn" disabled>Siguiente</button>
      <button class="secondary-btn" onclick="prevScreen()">Atrás</button>
    </div>
  `,
  style: () => `
    <div class="screen">
      <h2>Elige un Estilo</h2>
      <div class="grid">
        <button onclick="setStyle('Painted Hype')">🎨 Painted Hype</button>
        <button onclick="setStyle('Hype Match Day')">⚡ Hype Match Day</button>
        <button onclick="setStyle('Social Media Avatar')">👤 Social Media Avatar</button>
      </div>
      <button class="secondary-btn" onclick="prevScreen()">Atrás</button>
    </div>
  `,
  email: () => `
    <div class="screen">
      <h2>Tu Email</h2>
      <input type="email" id="emailInput" placeholder="ejemplo@correo.com" value="${state.email}" oninput="handleEmail(event)">
      <button onclick="nextScreen()">Ver Resultado</button>
      <button class="secondary-btn" onclick="prevScreen()">Atrás</button>
    </div>
  `,
  generating: () => `
    <div class="screen generating-screen">
      <div class="loader"></div>
      <h2>Generando tu Roster Moment...</h2>
      <p class="generating-text">Creando tu póster épico</p>
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

    return `
    <div class="screen">
      <h1>🏆 YOUR ROSTER MOMENT</h1>
      <div class="result-card">
        ${state.generatedImage 
          ? `<img src="${state.generatedImage}" class="photo-preview-large">`
          : state.photo 
            ? `<img src="${state.photo}" class="photo-preview-large">` 
            : '<div class="placeholder-img">No Photo</div>'}
        <h2 class="role-display">${roleEmojis[state.role] || ''} ${state.role.toUpperCase()}</h2>
        <p class="style-name">${state.style}</p>
        <p class="personality-msg">"${personality[state.role] || ''}"</p>
      </div>
      ${state.generatedImage ? `
        <div class="qr-section">
          <p class="qr-label">📱 Escanea para obtener tu imagen</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(state.generatedImage)}" alt="QR Code" class="qr-image">
        </div>
      ` : ''}
      <div class="email-sent">📧 Registrado: ${state.email}</div>
      <button onclick="resetApp()">🔄 Crear otra</button>
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
    container.innerHTML = `<img src="${state.photo}" class="photo-preview">`;
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

window.handleEmail = (event) => {
  state.email = event.target.value;
};

// Configuración de la API - Cambiar por la URL de producción al desplegar el backend
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : 'https://tu-backend-en-render.onrender.com'; // Sustituir por la URL real de Render/Railway

window.nextScreen = async () => {
  const screenKeys = Object.keys(screens);
  const currentIndex = screenKeys.indexOf(state.currentScreen);
  
  if (state.currentScreen === 'email') {
    state.currentScreen = 'generating';
    render();
    
    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: state.role,
          style: state.style,
          email: state.email,
          photo: state.photoBase64
        })
      });
      
      const data = await response.json();
      console.log('Respuesta del servidor:', data);
      
      if (data.imageUrl) {
        state.generatedImage = data.imageUrl;
      }
      
      state.currentScreen = 'result';
      render();
    } catch (error) {
      console.error('Error:', error);
      // Aunque falle, mostramos el resultado
      state.currentScreen = 'result';
      render();
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
    generatedImage: null
  };
  render();
};

// Initial render
render();
