import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import type { AdminProfile, AdminSession, AdminTokenPayload } from './admin-auth.types.js';
import type { LoginDto } from './dto/login.dto.js';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MILLISECONDS_PER_SECOND = 1000;
const BCRYPT_COST = 10;

/**
 * Single-admin authentication: credentials come from env, the session is a signed JWT.
 */
@Injectable()
export class AdminAuthService {
  private readonly adminEmail: string;
  private readonly passwordHash: string;
  // Compared against when the email is wrong, so a wrong email costs the same time as a wrong password.
  private readonly decoyHash: string = bcrypt.hashSync(randomUUID(), BCRYPT_COST);

  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly jwtService: JwtService,
  ) {
    this.adminEmail = configService.getOrThrow('ADMIN_EMAIL', { infer: true }).toLowerCase();
    this.passwordHash = configService.getOrThrow('ADMIN_PASSWORD_HASH', { infer: true });
  }

  /**
   * Checks the credentials and issues a session token. Wrong email and wrong password give the same 401.
   */
  async login({ email, password }: LoginDto): Promise<AdminSession> {
    const isEmailMatch: boolean = email.toLowerCase() === this.adminEmail;
    const isPasswordMatch: boolean = await bcrypt.compare(password, isEmailMatch ? this.passwordHash : this.decoyHash);
    if (!isEmailMatch || !isPasswordMatch) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, 'Invalid email or password');
    }
    const payload: AdminTokenPayload = { sub: 'admin', email: this.adminEmail };
    const token: string = await this.jwtService.signAsync(payload, { expiresIn: SESSION_TTL_SECONDS });
    return { token, maxAgeMs: SESSION_TTL_SECONDS * MILLISECONDS_PER_SECOND };
  }

  /**
   * Returns the admin profile for a valid token, or throws 401.
   */
  async authenticate(token: string | undefined): Promise<AdminProfile> {
    if (!token) {
      throw this.buildUnauthorized();
    }
    try {
      const payload: AdminTokenPayload = await this.jwtService.verifyAsync<AdminTokenPayload>(token);
      if (payload.sub !== 'admin' || payload.email !== this.adminEmail) {
        throw this.buildUnauthorized();
      }
      return { email: payload.email };
    } catch {
      throw this.buildUnauthorized();
    }
  }

  private buildUnauthorized(): AppException {
    return new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, 'Admin login required');
  }
}
