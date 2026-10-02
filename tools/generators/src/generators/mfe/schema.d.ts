/**
 * @file Options of the `mfe` generator (mirrors schema.json).
 */
export interface MfeGeneratorSchema {
  name: string;
  kind: 'domain' | 'capability' | 'hub';
  family?: 'case' | '360' | 'reporting';
  caseDomain?:
    | 'FRAUD'
    | 'BILLING_DISPUTE'
    | 'SERVICE_ASSURANCE'
    | 'NUMBER_PORTING'
    | 'PARTNER_ONBOARDING'
    | 'PARTNER_ONGOING'
    | 'PARTNER_FIELD_AUDIT';
  route?: string;
  label?: string;
  entitlement?: string;
  exposedName?: string;
  port?: number;
  owner?: string;
  skipFormat?: boolean;
}
