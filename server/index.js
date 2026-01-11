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
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // Brevo usa STARTTLS en el puerto 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Función para enviar email con el póster
async function sendPosterEmail(toEmail, imagePath) {
  try {
    // Brevo requiere que el remitente sea un EMAIL verificado, no el ID de usuario del SMTP.
    const senderEmail = process.env.EMAIL_FROM;
    
    if (!senderEmail) {
      console.error('❌ ERROR: EMAIL_FROM no está configurado en el .env');
      return false;
    }

    console.log(`📧 Intentando enviar email desde: ${senderEmail}`);

    const mailOptions = {
      from: `"Roster Moment" <${senderEmail}>`,
      to: toEmail,
      subject: '¡Tu Roster Moment ya está aquí! 🏆',
      text: '¡Hola! Aquí tienes tu póster épico de Cloud9. ¡Esperamos que te guste!',
      attachments: [
        {
          filename: 'roster-moment.png',
          path: imagePath
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado con éxito:', info.messageId);
    console.log('📬 Destinatario:', toEmail);
    return true;
  } catch (error) {
    console.error('❌ ERROR CRÍTICO AL ENVIAR EMAIL:', error.message);
    if (error.response) {
      console.error('Respuesta de Brevo:', error.response);
    }
    return false;
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Servir imágenes generadas
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// Crear carpeta para imágenes si no existe
const generatedDir = path.join(__dirname, 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir);
}

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
          
          fs.writeFileSync(filePath, buffer);
          
          // FORZAR URL PÚBLICA DE RENDER
          imageUrl = `https://cloud9-roster-moment.onrender.com/generated/${fileName}`;
          console.log('Imagen guardada y accesible en URL pública:', imageUrl);

          // Enviar email automáticamente
          if (email) {
            console.log('Iniciando envío de email a:', email);
            // IMPORTANTE: Esperar al envío del email para asegurar que no se corta el proceso
            await sendPosterEmail(email, filePath);
          }
          break;
        }
      }
    }
    
    console.log('Enviando respuesta al frontend...');
    res.json({
      success: true,
      message: 'Roster Moment generado',
      imageUrl,
      role,
      style,
      email
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
