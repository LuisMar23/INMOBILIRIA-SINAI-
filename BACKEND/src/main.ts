import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CONFIGURACIÓN ACTUAL MODIFICADA - Agregado localhost:4200
  app.enableCors({
    origin: [
      'http://localhost:4300',
      'http://localhost:4200' ,   'https://inmobiliriasinai.com',
    ],
    credentials: true,
  });

  // app.enableCors({
  //   origin: '*', // cualquier dominio
  // });

  app.setGlobalPrefix('apisinai');

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Serializar BigInt como string al convertir a JSON
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  await app.listen(process.env.PORT ?? 3301);
  console.log('Application is running on: http://localhost:3301/apisinai');
}
bootstrap();