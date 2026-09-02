import { CapabilityRegistry } from '../registry.js';
import {
  EpfoInquireAccountsCapability,
  EpfoTransferClaimCapability,
} from './epfo.js';
import {
  IdentityVerifyCredentialCapability,
  IdentityUpdatePanNameCapability,
} from './identity.js';
import {
  BusinessReserveNameCapability,
  BusinessIncorporateCapability,
} from './business.js';
import { TelecomBlockStolenDeviceCapability } from './telecom.js';
import { PaymentsProcessFeeCapability } from './payments.js';
import { WelfareEvaluateSchemesCapability } from './welfare.js';

export function registerDefaultCapabilities(): void {
  const registry = CapabilityRegistry.getInstance();

  // EPFO
  registry.register(EpfoInquireAccountsCapability);
  registry.register(EpfoTransferClaimCapability);

  // Identity
  registry.register(IdentityVerifyCredentialCapability);
  registry.register(IdentityUpdatePanNameCapability);

  // Business
  registry.register(BusinessReserveNameCapability);
  registry.register(BusinessIncorporateCapability);

  // Telecom
  registry.register(TelecomBlockStolenDeviceCapability);

  // Payments
  registry.register(PaymentsProcessFeeCapability);

  // Welfare
  registry.register(WelfareEvaluateSchemesCapability);
}
