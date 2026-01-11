import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import nodemailer from 'nodemailer';

// Obtener IP local de la red
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Inicializar Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Configurar transportador de Email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: 2525, // CAMBIO A PUERTO 2525 (Alternativo muy estable para Brevo)
  secure: false, // TLS en puerto 2525
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
});

// Función para enviar email con el póster usando la API de Brevo (más estable en Render)
async function sendPosterEmail(toEmail, imageDataBase64) {
  console.log(`📧 DEBUG: Iniciando proceso de envío vía API a ${toEmail}`);
  
  const apiKey = process.env.SMTP_PASS; // Usamos la misma API Key que ya tienes
  const senderEmail = process.env.EMAIL_FROM;

  if (!apiKey || !senderEmail) {
    console.error('❌ ERROR: API Key o EMAIL_FROM no configurados');
    return false;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "Roster Moment", email: senderEmail },
        to: [{ email: toEmail }],
        subject: "¡Tu Roster Moment ya está aquí! 🏆",
        textContent: "¡Hola! Aquí tienes tu póster épico de Cloud9. ¡Esperamos que te guste!",
        attachment: [
          {
            name: "roster-moment.png",
            content: imageDataBase64
          }
        ]
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ DEBUG: Email enviado con éxito vía API:', result.messageId || 'Success');
      return true;
    } else {
      console.error('❌ DEBUG: Error en la API de Brevo:', JSON.stringify(result));
      return false;
    }
  } catch (error) {
    console.error('❌ DEBUG: ERROR CRÍTICO AL ENVIAR EMAIL VÍA API:', error.message);
    return false;
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Servir imágenes generadas - Usar ruta absoluta para mayor seguridad
const generatedDir = path.join(__dirname, 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}
app.use('/generated', express.static(generatedDir));

// Función para generar el prompt según rol y estilo
function generatePrompt(role, style, hasPhoto = false, playersCount = 0) {
  
  // Instrucciones de MANDATO CRÍTICO (Para que no olvide al usuario)
  const mandatoryMandate = `
MANDATORY ROLE ASSIGNMENT:
- IMAGE 1 IS THE PRIMARY PROTAGONIST (The Fan). You MUST include this person as the central focus of the image. This is NON-NEGOTIABLE.
- IMAGES 2 to ${playersCount + 1} ARE THE SECONDARY TEAMMATES (The Pro Players).`;

  // Prompt base original adaptado para composición multimodal
  const basePrompt = `A high-impact esports poster composition featuring ${playersCount + 1} people total:
- THE FAN (Image 1): Central subject, foreground, largest scale. The entire poster revolves around this person.
- ${playersCount} PROFESSIONAL PLAYERS (Images 2 to ${playersCount + 1}): Arranged around the fan.

The fan is positioned at the exact center of the image, slightly forward, as the clear visual protagonist.
The players are arranged in a cinematic, staggered ensemble composition.

All subjects are fully integrated into the same visual style.
The fan is wearing an official Cloud9 esports jersey.
Vertical orientation, 4:5 aspect ratio.`;

  const stylePrompts = {
    'Painted Hype': `
STYLE: Masterpiece Esports Digital Illustration.
- Technique: Thick, expressive oil-painting style with visible palette knife textures and bold brush strokes.
- Color Palette: Dominant Cloud9 blues (deep navy to electric cyan), crisp whites, and cinematic warm orange/gold highlights for contrast.
- Lighting: Intense, dramatic "Rembrandt" lighting on faces. High-contrast chiaroscuro effect.
- Energy: Dynamic paint splashes, ethereal energy wisps, and motion-blurred paint fragments exploding from the subjects.
- Atmosphere: A fusion of a high-tech arena and a dreamlike artistic void. No flat backgrounds.
- Subjects: Faces must be recognizable but rendered with artistic soul. The fan should look heroic and integrated into the paint texture.`,

    'Hype Match Day': `
STYLE: Elite Esports Victory Celebration.
- Subjects: Intense, emotional expressions. Everyone is visibly excited, shouting in joy, or cheering. 
- Posture: Dynamic and triumphant—arms raised, fists pumped, leaning forward as if celebrating a championship point.
- Lighting: Aggressive neon rim lighting, cinematic lens flares, and volumetric spotlights dancing across the arena.
- Background: A high-tech futuristic esports arena stadium at the peak of a grand final. Holographic Cloud9 banners and digital confetti in the air.
- Visual Effects: Floating data particles, electrical sparks, and vibrant energy streaks that amplify the hype.
- Texture: Sharp, clean, and high-definition.
- Atmosphere: Pure victory, adrenaline, and hype.
- Colors: Electrified cyan, deep space black, and brilliant white flashes.`,

    'Social Media Avatar': `
INDIVIDUAL PORTRAIT TASK:
- FOCUS ONLY ON IMAGE 1 (The Fan). Ignore all other player images.
- Subject: The Fan from Image 1, facing forward, confident posture with arms crossed.
- Clothing: Wearing a high-quality, realistic Cloud9 esports jersey.
- Style: Photorealistic, clean, sharp focus.
- Background: Neutral, studio-like professional background (blurred or solid clean color).
- Composition: Waist-up shot, centered, perfect for social media profile pictures.
- Likeness: Maximum fidelity to the fan's facial features.`
  };

  const selectedStyle = stylePrompts[style] || stylePrompts['Painted Hype'];

  const negativePrompt = `
AVOID:
- Generic faces
- More than 1 person if 'Social Media Avatar' is selected
- Photorealistic collage (unified artwork required)
- Text that is not "Cloud9"
- Mismatched lighting`;

  return `STRICT IDENTITY PRESERVATION MODE:
${mandatoryMandate}

Use the provided images as visual blueprints.

${style === 'Social Media Avatar' ? 'CREATE AN INDIVIDUAL PORTRAIT' : basePrompt}

STYLE INSTRUCTIONS:
${selectedStyle}

${negativePrompt}`;
}

// Endpoint principal
app.post('/generate', async (req, res) => {
  const { role, style, email, photo } = req.body;
  
  console.log('=== Nueva solicitud ===');
  console.log('Rol:', role);
  console.log('Estilo:', style);
  console.log('Email:', email);
  console.log('Foto recibida:', photo ? 'Sí' : 'No');
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-pro-image-preview'
    });

    // 1. Cargar fotos de los jugadores desde el servidor
    let contentParts = [];
    const playersDir = path.join(__dirname, 'assets', 'players');
    let playersCount = 0;

    if (fs.existsSync(playersDir)) {
      const playerFiles = fs.readdirSync(playersDir).filter(file => 
        ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file).toLowerCase())
      );

      // Si el estilo es 'Social Media Avatar', NO añadimos jugadores para evitar confusiones.
      // Solo añadimos jugadores para los estilos de composición grupal.
      const selectedPlayers = (style === 'Social Media Avatar') ? [] : playerFiles.slice(0, 5);
      playersCount = selectedPlayers.length;

      // El fan (la foto del usuario) DEBE ir primero según nuestro nuevo prompt
      if (photo && photo.startsWith('data:image')) {
        const base64Data = photo.split(',')[1];
        const mimeType = photo.split(';')[0].split(':')[1];
        contentParts.push({
          inlineData: { mimeType, data: base64Data }
        });
        console.log('Imagen del usuario añadida como sujeto principal');
      }

      // Añadir a los jugadores
      for (const file of selectedPlayers) {
        const filePath = path.join(playersDir, file);
        const fileData = fs.readFileSync(filePath);
        const extension = path.extname(file).substring(1);
        const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        
        contentParts.push({
          inlineData: {
            mimeType: mimeType,
            data: fileData.toString('base64')
          }
        });
        console.log(`Jugador añadido: ${file}`);
      }
    } else if (photo && photo.startsWith('data:image')) {
      // Fallback si no hay carpeta de jugadores, solo usamos la del usuario
      const base64Data = photo.split(',')[1];
      const mimeType = photo.split(';')[0].split(':')[1];
      contentParts.push({
        inlineData: { mimeType, data: base64Data }
      });
    }

    const hasPhoto = photo && photo.startsWith('data:image');
    const prompt = generatePrompt(role, style, hasPhoto, playersCount);
    
    // El texto del prompt debe ser la primera parte o estar presente
    contentParts.unshift({ text: prompt });

    console.log('Prompt enviado');
    console.log('Total imágenes enviadas:', contentParts.length - 1);
    
    console.log('Enviando solicitud a Google AI...');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: contentParts }],
      generationConfig: {
        responseModalities: ['image', 'text'],
      },
    });
    
    console.log('Respuesta recibida de Google AI');
    const response = result.response;
    
    // Log detallado de la estructura de la respuesta
    console.log('Estructura de candidates:', JSON.stringify(response.candidates.map(c => ({
      index: c.index,
      parts: c.content.parts.map(p => Object.keys(p))
    })), null, 2));
    
    let imageUrl = null;
    
    // Buscar la imagen en la respuesta
    if (response.candidates && response.candidates[0] && response.candidates[0].content) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log('MIME Type recibido:', part.inlineData.mimeType);
          console.log('Longitud de datos base64:', part.inlineData.data.length);
          
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType;
          const extension = mimeType.split('/')[1] || 'png';
          
          const fileName = `roster_${Date.now()}.${extension}`;
          const filePath = path.join(generatedDir, fileName);
          
          // Verificamos el buffer antes de escribir
          const buffer = Buffer.from(imageData, 'base64');
          console.log('Tamaño del buffer creado:', buffer.length, 'bytes');
          
          imageUrl = `https://cloud9-roster-moment.onrender.com/generated/${fileName}`;
          console.log('Imagen guardada y accesible en URL pública:', imageUrl);

          // Enviar email automáticamente (SIN AWAIT para no bloquear la respuesta)
          if (email) {
            console.log('Iniciando envío de email en segundo plano a:', email);
            // USAR EL BASE64 DIRECTAMENTE EN EL EMAIL PARA EVITAR ENOENT
            sendPosterEmail(email, imageData).then(success => {
              console.log(success ? '✅ Email de fondo enviado' : '❌ Email de fondo falló');
            });
          }

          console.log('Enviando respuesta al frontend...');
          // USAR imageData directamente que está definido en el scope del for
          res.json({
            success: true,
            message: 'Roster Moment generado',
            imageUrl,
            imageName: fileName, // Enviamos el nombre del archivo para el QR
            imageBase64: imageData,
            role,
            style,
            email
          });
          return;
        }
      }
    }

    // SEGURIDAD: Si llegamos aquí sin haber enviado respuesta (ej. no hubo inlineData)
    console.warn('⚠️ No se encontró inlineData en la respuesta de Google AI');
    res.status(500).json({
      success: false,
      message: 'La IA no generó una imagen válida. Intenta con otro estilo.',
      error: 'Missing inlineData'
    });
    
  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error generando imagen',
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Roster Moment Backend corriendo en:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Red:     http://${LOCAL_IP}:${PORT}`);
});
