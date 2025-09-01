/**
 * Middleware customizado para parsear body de requisições
 * Substitui completamente o body-parser padrão do Express
 */
const customBodyParser = (req, res, next) => {
  // Métodos que NUNCA devem ter body
  const methodsWithoutBody = ['GET', 'DELETE', 'HEAD', 'OPTIONS'];
  
  if (methodsWithoutBody.includes(req.method)) {
    req.body = {};
    return next();
  }
  
  // Para métodos com body (POST, PUT, PATCH)
  let data = '';
  
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    try {
      if (data.trim() === '') {
        req.body = {};
      } else {
        req.body = JSON.parse(data);
      }
    } catch (error) {
      // Se falhar o parse, define body vazio
      req.body = {};
    }
    next();
  });
  
  req.on('error', () => {
    req.body = {};
    next();
  });
};

module.exports = customBodyParser;
