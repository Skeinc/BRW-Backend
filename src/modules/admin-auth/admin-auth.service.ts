import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import type { AdminProfile, AdminTokenPayload } from './types/admin-auth.types.js';
import type { LoginDto } from './dto/login.dto.js';

const CREDENTIAL_VERSION_LENGTH = 32;

/**
 * Single-admin authentication: credentials come from the environment, there is no users table.
 */
@Injectable()
export class AdminAuthService {
  private readonly adminLogin: string;
  private readonly adminPassword: string | undefined;
  private readonly adminPasswordHash: string | undefined;
  private readonly credentialVersion: string;

  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly jwtService: JwtService,
  ) {
    this.adminLogin = configService.getOrThrow('ADMIN_LOGIN', { infer: true }).trim().toLowerCase();
    this.adminPassword = configService.get('ADMIN_PASSWORD', { infer: true });
    this.adminPasswordHash = configService.get('ADMIN_PASSWORD_HASH', { infer: true });
    this.credentialVersion = this.buildCredentialVersion(configService.getOrThrow('JWT_SECRET', { infer: true }));
  }

  /**
   * Checks the credentials and returns a signed token. Fails with 401 UNAUTHORIZED for any mismatch.
   */
  async login({ login, password }: LoginDto): Promise<string> {
    const isLoginValid: boolean = this.isSameText(login.trim().toLowerCase(), this.adminLogin);
    const isPasswordValid: boolean = await this.isPasswordValid(password);
    if (!isLoginValid || !isPasswordValid) {
      throw this.buildUnauthorizedException('Invalid login or password');
    }
    const payload: AdminTokenPayload = { sub: this.adminLogin, cv: this.credentialVersion };
    return this.jwtService.signAsync(payload);
  }

  /**
   * Verifies a token and returns the admin profile; fails with 401 UNAUTHORIZED when it is invalid or expired.
   */
  async verifyToken(token: string): Promise<AdminProfile> {
    try {
      const payload: AdminTokenPayload = await this.jwtService.verifyAsync<AdminTokenPayload>(token);
      if (
        !this.isSameText(payload.sub, this.adminLogin) ||
        !this.isSameText(payload.cv ?? '', this.credentialVersion)
      ) {
        throw this.buildUnauthorizedException('Authentication required');
      }
      return { login: payload.sub };
    } catch (err) {
      throw err instanceof AppException ? err : this.buildUnauthorizedException('Authentication required');
    }
  }

  /**
   * Builds the 401 error used by login and the guard.
   */
  buildUnauthorizedException(message: string): AppException {
    return new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, message);
  }

  /** Keyed hash of the current login and password (or hash), so changing either one invalidates old tokens. */
  private buildCredentialVersion(secret: string): string {
    const credential = `${this.adminLogin}\n${this.adminPassword ?? this.adminPasswordHash ?? ''}`;
    return createHmac('sha256', secret).update(credential).digest('hex').slice(0, CREDENTIAL_VERSION_LENGTH);
  }

  private async isPasswordValid(password: string): Promise<boolean> {
    if (this.adminPassword !== undefined) {
      return this.isSameText(password, this.adminPassword);
    }
    if (this.adminPasswordHash !== undefined) {
      return bcrypt.compare(password, this.adminPasswordHash);
    }
    return false;
  }

  /** Constant-time comparison; hashing first makes both buffers the same length. */
  private isSameText(left: string, right: string): boolean {
    const leftDigest: Buffer = createHash('sha256').update(left).digest();
    const rightDigest: Buffer = createHash('sha256').update(right).digest();
    return timingSafeEqual(leftDigest, rightDigest);
  }
}
