import 'reflect-metadata';

import './load-env';

import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  const grpcPort = process.env.GRPC_PORT ?? '50051';
  const protoPath = join(
    __dirname,
    '../../../packages/proto/gmail_message.proto',
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'gmail',
      protoPath,
      url: `0.0.0.0:${grpcPort}`,
      loader: {
        keepCase: false,
      },
    },
  });

  await app.startAllMicroservices();
  console.log(`gRPC server running on 0.0.0.0:${grpcPort}`);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
void bootstrap();
