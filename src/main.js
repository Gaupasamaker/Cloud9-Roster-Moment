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
      <h2>Elige un Estilo y Email</h2>
      <div class="grid">
        <button class="style-btn" id="style-Painted-Hype" onclick="state.style = 'Painted Hype'; updateStyleSelection()">🎨 Painted Hype</button>
        <button class="style-btn" id="style-Hype-Match-Day" onclick="state.style = 'Hype Match Day'; updateStyleSelection()">⚡ Hype Match Day</button>
        <button class="style-btn" id="style-Social-Media-Avatar" onclick="state.style = 'Social Media Avatar'; updateStyleSelection()">👤 Social Media Avatar</button>
      </div>
      
      <div style="margin-top: 1.5rem; text-align: left;">
        <label for="emailInput" style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; opacity: 0.8;">Tu Email (para enviarte el póster):</label>
        <input type="email" id="emailInput" placeholder="ejemplo@correo.com" value="${state.email}" oninput="handleEmail(event)">
      </div>

      <button onclick="nextScreen()" style="margin-top: 1rem; background: var(--accent-blue); color: #0a192f;">Ver Resultado 🏆</button>
      <button class="secondary-btn" onclick="prevScreen()">Atrás</button>
    </div>
  `,
  generating: () => `
    <div class="screen generating-screen">
      <div class="loader"></div>
      <h2>Generando tu Roster Moment...</h2>
      <p class="generating-text">Creando tu póster épico</p>
      <div id="status-log" style="font-size: 0.8rem; margin-top: 1rem; opacity: 0.5; color: #64ffda;">
        Iniciando conexión con el servidor...
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

    return `
    <div class="screen">
      <h1>🏆 YOUR ROSTER MOMENT</h1>
      <div class="result-card">
        ${state.generatedImage 
          ? `<img src="${state.generatedImage}" class="photo-preview-large" alt="Póster generado">`
          : state.photo 
            ? `<img src="${state.photo}" class="photo-preview-large" alt="Previsualización de foto">` 
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

window.updateStyleSelection = () => {
  const btns = document.querySelectorAll('.style-btn');
  btns.forEach(btn => {
    btn.style.background = 'rgba(100, 255, 218, 0.1)';
    btn.style.border = '1px solid var(--accent-blue)';
  });
  
  const selectedId = `style-${state.style.replace(/\s+/g, '-')}`;
  const selectedBtn = document.getElementById(selectedId);
  if (selectedBtn) {
    selectedBtn.style.background = 'var(--accent-blue)';
    selectedBtn.style.color = '#0a192f';
  }
};

window.handleEmail = (event) => {
  state.email = event.target.value;
};

// Configuración de la API - URL de Render para producción
const API_URL = 'https://cloud9-roster-moment.onrender.com';

window.nextScreen = async () => {
  const screenKeys = Object.keys(screens);
  const currentIndex = screenKeys.indexOf(state.currentScreen);
  
  if (state.currentScreen === 'email') {
    // 1. Mostrar pantalla de carga inmediatamente
    state.currentScreen = 'generating';
    render();
    
    const statusLog = document.getElementById('status-log');
    
    try {
      if(statusLog) statusLog.innerText = `Llamando a: ${API_URL}...`;
      
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

      if(statusLog) statusLog.innerText = 'Recibiendo respuesta de la IA...';

      if (!response.ok) {
        throw new Error(`Error en la petición: ${response.status}`);
      }
      
      const data = await response.json();
      if(statusLog) statusLog.innerText = '¡Imagen generada con éxito!';
      
      if (data.imageUrl) {
        state.generatedImage = data.imageUrl;
      }
      
      // Fallback: Si el servidor envía la imagen en Base64, usarla (más fiable en producción)
      if (data.imageBase64) {
        state.generatedImage = `data:image/jpeg;base64,${data.imageBase64}`;
      }
    } catch (error) {
      console.error('Error detallado:', error);
      if(statusLog) statusLog.innerText = `❌ Error: ${error.message}`;
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
    
    // Si pasamos a la pantalla de estilo, resaltar el estilo por defecto
    if (state.currentScreen === 'style') {
      setTimeout(updateStyleSelection, 50);
    }
    
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
