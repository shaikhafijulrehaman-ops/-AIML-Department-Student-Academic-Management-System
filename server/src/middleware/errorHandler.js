export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || (err.type === 'entity.too.large' ? 413 : 500);
  console.error('[ServerError]', err.message || err);

  res.status(statusCode).json({
    success: false,
    message: err.message || (statusCode === 413 ? 'Uploaded image or payload is too large.' : 'Internal Server Error'),
    error: err.message || (statusCode === 413 ? 'Uploaded image or payload is too large.' : 'Internal Server Error'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
