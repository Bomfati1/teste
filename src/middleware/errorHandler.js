const errorHandler = (err, req, res, next) => {
  console.error("ERRO CAPTURADO PELO MIDDLEWARE:", err);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose bad ObjectId, etc.
  if (err.name === "CastError") {
    message = `Recurso não encontrado com o id ${err.value}`;
    statusCode = 404;
  }

  res.status(statusCode).json({
    message: message,
    // Only show the stack trace in development mode for security
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = errorHandler;
