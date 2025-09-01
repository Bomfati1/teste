/**
 * Middleware para tratar requisições DELETE
 * Garante que DELETE requests sempre tenham body vazio
 */
const deleteHandler = (req, res, next) => {
  if (req.method === 'DELETE') {
    // Força body vazio para DELETE requests
    req.body = {};
    
    // Log para debug
    console.log(`🗑️  DELETE request para ${req.path}`);
    console.log(`📝 Params:`, req.params);
    console.log(`📦 Body (forçado vazio):`, req.body);
  }
  
  next();
};

module.exports = deleteHandler;
