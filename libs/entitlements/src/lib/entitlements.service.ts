/**
 * @file RBAC + feature flags for the signed-in user.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { EntitlementsResponse } from '@platform/contracts';

export const ENTITLEMENTS_URL = '/api/me/entitlements';

/**
 * RBAC + feature flags for the signed-in user. The shell loads it once after sign-in
 * (and again on persona switch in mock mode); every MFE reads it, none writes it.
 */
@Injectable({ providedIn: 'root' })
export class EntitlementsService {
  private readonly http = inject(HttpClient);
  private readonly _entitlements = signal<ReadonlySet<string>>(new Set());
  private readonly _flags = signal<Readonly<Record<string, boolean>>>({});
  private readonly _loaded = signal(false);

  readonly entitlements = this._entitlements.asReadonly();
  readonly featureFlags = this._flags.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly count = computed(() => this._entitlements().size);

  async load(): Promise<void> {
    const res = await firstValueFrom(this.http.get<EntitlementsResponse>(ENTITLEMENTS_URL));
    this.set(res);
  }

  /** For tests and dev harnesses. */
  set(res: EntitlementsResponse): void {
    this._entitlements.set(new Set(res.entitlements));
    this._flags.set(res.featureFlags);
    this._loaded.set(true);
  }

  clear(): void {
    this._entitlements.set(new Set());
    this._flags.set({});
    this._loaded.set(false);
  }

  /** `undefined` means "no entitlement required". */
  has(entitlement: string | undefined): boolean {
    return !entitlement || this._entitlements().has(entitlement);
  }

  isEnabled(flag: string): boolean {
    return this._flags()[flag] === true;
  }
}
