// MUST be the first import — `@shiplog/database` reads `DATABASE_URL` at
// module-load time, before NestJS's ConfigModule has a chance to populate
// `process.env` from the .env file. Loading dotenv here keeps that
// initialization order correct.
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
