const errorHandler = (err, req, res, next) => {
  console.error("ERRO CAPTURADO PELO MIDDLEWARE:", err);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose bad ObjectId, etc.
  if (err.name === "CastError") {
    message = `Recurso não encontrado com o id ${err.value}`;
    statusCode = 404;
  }

  // Erro de JSON malformado (body-parser)
  if (err.type === 'entity.parse.failed') {
    message = "JSON malformado ou body vazio na requisição";
    statusCode = 400;
  }

  // Erro de sintaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    message = "JSON inválido na requisição";
    statusCode = 400;
  }

  // Erro de body muito grande
  if (err.type === 'entity.too.large') {
    message = "Body da requisição muito grande";
    statusCode = 413;
  }

  res.status(statusCode).json({
    message: message,
    error: {
      type: err.type || err.name,
      statusCode: statusCode
    },
    // Only show the stack trace in development mode for security
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
  });
};

module.exports = errorHandler;
