-- CreateTable
CREATE TABLE "oauthClients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT,
    "clientName" TEXT,
    "redirectUris" JSONB NOT NULL,
    "grantTypes" TEXT[],
    "scope" TEXT,
    "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauthClients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauthAuthorizationCodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL DEFAULT 'S256',
    "scope" TEXT,
    "resource" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauthAuthorizationCodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauthRefreshTokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scope" TEXT,
    "resource" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauthRefreshTokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauthClients_clientId_key" ON "oauthClients"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "oauthAuthorizationCodes_code_key" ON "oauthAuthorizationCodes"("code");

-- CreateIndex
CREATE INDEX "oauthAuthorizationCodes_userId_idx" ON "oauthAuthorizationCodes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauthRefreshTokens_tokenHash_key" ON "oauthRefreshTokens"("tokenHash");

-- CreateIndex
CREATE INDEX "oauthRefreshTokens_userId_idx" ON "oauthRefreshTokens"("userId");

-- AddForeignKey
ALTER TABLE "oauthAuthorizationCodes" ADD CONSTRAINT "oauthAuthorizationCodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthAuthorizationCodes" ADD CONSTRAINT "oauthAuthorizationCodes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauthClients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthRefreshTokens" ADD CONSTRAINT "oauthRefreshTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthRefreshTokens" ADD CONSTRAINT "oauthRefreshTokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauthClients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
