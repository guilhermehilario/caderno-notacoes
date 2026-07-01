/**
 * 🔒 Middleware de validação reutilizável
 *
 * Centraliza validações comuns de entrada e ownership para
 * evitar duplicação nos módulos de rota e garantir consistência
 * nas respostas de erro.
 */

/**
 * Valida que campos obrigatórios estão presentes no body.
 * Uso: router.post('/path', validateBody('title', 'color'), handler)
 */
export function validateBody(...requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null,
    );

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Campos obrigatórios ausentes: ${missing.join(', ')}`,
        message: `Os campos ${missing.join(', ')} são obrigatórios.`,
      });
    }

    next();
  };
}

/**
 * Valida que o score de estudo está no range 0-5.
 */
export function validateStudyScore(req, res, next) {
  const { score } = req.body;

  if (score === undefined || score === null) {
    return res.status(400).json({ error: 'Score é obrigatório' });
  }

  const num = Number(score);
  if (!Number.isInteger(num) || num < 0 || num > 5) {
    return res.status(400).json({
      error: 'Score inválido',
      message: 'O score deve ser um número inteiro entre 0 e 5.',
    });
  }

  // Normaliza para inteiro
  req.body.score = num;
  next();
}

/**
 * Validação básica de email.
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper para respostas de erro consistentes.
 */
export function sendError(res, status, error, message) {
  return res.status(status).json({
    error,
    ...(message ? { message } : {}),
  });
}

/**
 * Helper para respostas de sucesso.
 */
export function sendSuccess(res, data, status = 200) {
  return res.status(status).json(data);
}
