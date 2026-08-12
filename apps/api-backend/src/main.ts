import 'reflect-metadata';

import './load-env';

import { join } from 'node:path';

import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { getIssuerUrl, getResourceUrl } from './mcp/oauth/oauth.config';
import { OAuthProvider } from './mcp/oauth/oauth.provider';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // Mount the MCP OAuth 2.1 authorization server at the application root.
  // This serves the discovery documents (/.well-known/*), dynamic client
  // registration (/register), and the /authorize, /token, /revoke endpoints,
  // all backed by our OAuthProvider. Clients like Gemini use these to obtain
  // a bearer token before calling /mcp.
  const oauthProvider = app.get(OAuthProvider);
  app.use(
    mcpAuthRouter({
      provider: oauthProvider,
      issuerUrl: getIssuerUrl(),
      resourceServerUrl: getResourceUrl(),
      scopesSupported: ['mcp'],
      resourceName: 'Coinmaester MCP',
    }),
  );

  // The gRPC service has no authentication, so it must never be exposed
  // publicly. Default to loopback; override via GRPC_BIND_HOST only for
  // private networks (e.g. 0.0.0.0 inside a container network).
  const grpcBindHost = process.env.GRPC_BIND_HOST ?? '127.0.0.1';
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
      url: `${grpcBindHost}:${grpcPort}`,
      loader: {
        keepCase: false,
      },
    },
  });

  await app.startAllMicroservices();
  console.log(`gRPC server running on ${grpcBindHost}:${grpcPort}`);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on http://0.0.0.0:${port}`);
}
void bootstrap();
