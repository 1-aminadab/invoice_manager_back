import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe())

  const config = new DocumentBuilder()

    .setTitle('Lepton Games')

    .setDescription('Lepton Games API description')

    .setVersion('0.1')

    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api-docs', app, document);


  await app.listen(5000);

}

bootstrap();