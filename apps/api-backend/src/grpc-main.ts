import './load-env';

import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';

import { GrpcAppModule } from './grpc-app.module';

async function bootstrap() {
  const grpcPort = process.env.GRPC_PORT ?? '50051';
  const protoPath = join(
    __dirname,
    '../../../packages/proto/gmail_message.proto',
  );

  const app = await NestFactory.createMicroservice(GrpcAppModule, {
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

  app.enableShutdownHooks();
  await app.listen();
  console.log(`gRPC server running on 0.0.0.0:${grpcPort}`);
}
void bootstrap();
