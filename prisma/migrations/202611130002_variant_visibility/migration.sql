ALTER TABLE "Variant" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");
