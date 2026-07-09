import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Global API prefix ──
  app.setGlobalPrefix('api');

  // ── Security Headers (Helmet) ──
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // ── CORS ──
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production' && !process.env.FRONTEND_URL) {
    throw new Error(
      '❌ FRONTEND_URL é obrigatória em produção. ' +
      'Defina a variável de ambiente FRONTEND_URL com a URL do frontend (ex: https://meuapp.com).',
    );
  }

  const origin = process.env.FRONTEND_URL || 'http://localhost:5173';

  app.enableCors({
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Cookie Parser ──
  app.use(cookieParser());

  // ── Request Logger (apenas em dev, sem dados sensíveis) ──
  if (nodeEnv !== 'production') {
    app.use((req: any, res: any, next: () => void) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`,
        );
      });
      next();
    });
  }

  const PORT = process.env.PORT || 3000;
  const frontendUrl = origin;

  await app.listen(PORT, () => {
    const divider = '='.repeat(45);
    console.log(divider);
    console.log(`  Servidor NestJS rodando em: http://localhost:${PORT}`);
    console.log(`  Base da API: http://localhost:${PORT}/api`);
    console.log(`  Frontend: ${frontendUrl}`);
    console.log(`  Ambiente: ${nodeEnv}`);
    console.log(divider);
  });
}

bootstrap();
