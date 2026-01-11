self.addEventListener('install', (e) => {
  console.log('PWA Service Worker instalado');
});

self.addEventListener('fetch', (e) => {
  // Estrategia de red solamente para evitar cachear la API de IA
  return;
});
