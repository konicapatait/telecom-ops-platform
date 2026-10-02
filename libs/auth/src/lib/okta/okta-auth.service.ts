/**
 * @file Okta (OIDC + PKCE) implementation.
 */
import { Injectable, inject, signal } from '@angular/core';
import type { AuthUser } from '@platform/contracts';
import type { OktaAuth } from '@okta/okta-auth-js';
import { AuthService } from '../auth.service';
import { OKTA_CONFIG } from '../provide-auth';

/**
 * Okta (OIDC + PKCE) implementation. The SDK is loaded lazily so mock configurations
 * and remotes running standalone never download it. Token refresh is handled by the
 * SDK's token manager (autoRenew).
 */
@Injectable()
export class OktaAuthService extends AuthService {
  private readonly config = inject(OKTA_CONFIG);
  private readonly _user = signal<AuthUser | null>(null);
  private client?: OktaAuth;

  readonly user = this._user.asReadonly();

  private async sdk(): Promise<OktaAuth> {
    if (!this.client) {
      const { OktaAuth } = await import('@okta/okta-auth-js');
      this.client = new OktaAuth({
        issuer: this.config.issuer,
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
        postLogoutRedirectUri: this.config.postLogoutRedirectUri,
        scopes: this.config.scopes ?? ['openid', 'profile', 'email', 'offline_access'],
        pkce: true,
        tokenManager: { autoRenew: true },
      });
      this.client.start();
    }
    return this.client;
  }

  async init(): Promise<void> {
    const okta = await this.sdk();
    if (okta.isLoginRedirect()) {
      await okta.handleLoginRedirect();
    }
    if (await okta.isAuthenticated()) {
      const claims = await okta.getUser();
      this._user.set({
        userId: claims.sub,
        displayName: claims.name ?? claims.email ?? claims.sub,
        email: claims.email ?? '',
      });
    }
  }

  async login(returnUrl = '/'): Promise<void> {
    const okta = await this.sdk();
    okta.setOriginalUri(returnUrl);
    await okta.signInWithRedirect();
  }

  async logout(): Promise<void> {
    const okta = await this.sdk();
    this._user.set(null);
    await okta.signOut();
  }

  async getAccessToken(): Promise<string | null> {
    const okta = await this.sdk();
    return okta.getAccessToken() ?? null;
  }
}
