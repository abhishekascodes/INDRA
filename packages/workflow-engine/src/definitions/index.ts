import { WorkflowRegistry } from '../registry.js';
import { RecoverDormantPfWorkflow } from './recover-pf.js';
import { StartBusinessWorkflow } from './start-business.js';
import { LostPhoneWorkflow } from './lost-phone.js';
import { ResolveMismatchWorkflow } from './resolve-mismatch.js';
import { RenewPassportWorkflow } from './renew-passport.js';
import { CheckItrStatusWorkflow } from './check-itr-status.js';
import { SettleTrafficChallanWorkflow } from './settle-challan.js';

export function registerDefaultWorkflows(): void {
  const registry = WorkflowRegistry.getInstance();
  registry.register(RecoverDormantPfWorkflow);
  registry.register(StartBusinessWorkflow);
  registry.register(LostPhoneWorkflow);
  registry.register({
    ...LostPhoneWorkflow,
    code: 'LOST_PHONE',
  });
  registry.register(ResolveMismatchWorkflow);
  registry.register({
    ...ResolveMismatchWorkflow,
    code: 'PAN_NAME_CORRECTION',
    title: 'Harmonize PAN Identity with Aadhaar Ground Truth',
  });
  registry.register(RenewPassportWorkflow);
  registry.register(CheckItrStatusWorkflow);
  registry.register(SettleTrafficChallanWorkflow);
}

