import { WorkflowRegistry } from '../registry.js';
import { RecoverDormantPfWorkflow } from './recover-pf.js';
import { StartBusinessWorkflow } from './start-business.js';
import { LostPhoneWorkflow } from './lost-phone.js';
import { ResolveMismatchWorkflow } from './resolve-mismatch.js';

export function registerDefaultWorkflows(): void {
  const registry = WorkflowRegistry.getInstance();
  registry.register(RecoverDormantPfWorkflow);
  registry.register(StartBusinessWorkflow);
  registry.register(LostPhoneWorkflow);
  registry.register(ResolveMismatchWorkflow);
}
