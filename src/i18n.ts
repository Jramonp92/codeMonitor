// src/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// --- INICIO DEL CAMBIO ---
// 1. Importamos el 'Backend' que se encargará de cargar los archivos JSON
import Backend from 'i18next-http-backend';
// --- FIN DEL CAMBIO ---

i18n
  // --- INICIO DEL CAMBIO ---
  // 2. Le decimos a i18next que use el backend para cargar los archivos
  .use(Backend)
  // --- FIN DEL CAMBIO ---
  // Detecta el idioma del navegador del usuario
  .use(LanguageDetector)
  // Pasa la instancia de i18n a react-i18next
  .use(initReactI18next)
  // Inicializa i18next
  .init({
    // Idioma por defecto si la detección falla o el idioma no está soportado
    fallbackLng: 'en',
    
    // Lista de idiomas soportados por tu aplicación
    supportedLngs: ['en', 'es','pt','fr','it','ru','de'],

    // Opción para depuración en la consola. Muy útil durante el desarrollo.
    debug: true,

    interpolation: {
      // React ya protege contra XSS, por lo que esto no es necesario.
      escapeValue: false, 
    },
  });

export default i18n;