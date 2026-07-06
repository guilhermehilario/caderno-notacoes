import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Global API prefix ──
  app.setGlobalPrefix('api');

  // ── CORS ──
  const origin = process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || false
    : true;

  app.enableCors({
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Cookie Parser ──
  app.use(cookieParser());

  // ── Logger estruturado ──
  app.use((req: any, res: any, next: () => void) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`,
      );
    });
    next();
  });

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, () => {
    console.log('=============================================');
    console.log(`  🚀 Servidor NestJS rodando em: http://localhost:${PORT}`);
    console.log(`  📡 Base da API: http://localhost:${PORT}/api`);
    console.log('=============================================');
  });
}

bootstrap();
