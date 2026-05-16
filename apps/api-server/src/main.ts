import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './shared/errors/api-exception.filter';
import { ApiResponseInterceptor } from './shared/responses/api-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();

function getAllowedOrigins() {
  return (
    process.env.CORS_ORIGIN?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []
  );
}
