import { env } from '../config/env.js';

export function notFound(_req, res) {
  res.status(404).json({ error: { message: 'Rota não encontrada' } });
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);
  let status = err.status || err.statusCode || 500;

  let message = err.message || 'Erro interno';
  if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') {
    status = 400;
    message =
      err.code === 'LIMIT_FILE_COUNT'
        ? 'Quantidade de arquivos excedida'
        : 'Arquivo excede o tamanho máximo permitido';
  } else if (err.message === 'Tipo de arquivo não permitido') {
    status = 400;
    message = err.message;
  } else if (status >= 500) {
    message = env.isProd ? 'Erro interno' : message;
  }

  res.status(status).json({
    error: {
      message,
    },
  });
}
