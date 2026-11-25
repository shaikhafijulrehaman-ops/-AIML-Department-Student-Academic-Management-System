import app from './app.js';
import { ENV } from './config/env.js';

const PORT = ENV.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` AIML Department Portal - Express API Backend`);
  console.log(` DVR & Dr. HS MIC College of Technology`);
  console.log(` Server running on: http://localhost:${PORT}`);
  console.log(` Health check:      http://localhost:${PORT}/api/health`);
  console.log(` Environment:       ${ENV.NODE_ENV}`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
