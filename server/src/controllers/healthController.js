/**
 * Health check controller
 * Returns status of the backend API service
 */
export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'AIML Department Student Academic Management System API',
    institution: 'DVR & Dr. HS MIC College of Technology',
    department: 'Artificial Intelligence and Machine Learning (AIML)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};
