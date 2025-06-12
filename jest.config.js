export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapper: {
      '\\.(css|less)$': 'identity-obj-proxy',
    },
    transform: {
      '^.+\\.tsx?$': [
        'ts-jest',
        {
          tsconfig: {
            // Esta opción le dice a TypeScript cómo manejar JSX
            jsx: 'react-jsx', 
            // --- LÍNEA AÑADIDA PARA SOLUCIONAR EL NUEVO ERROR ---
            esModuleInterop: true,
          },
        },
      ],
    },
  };
  