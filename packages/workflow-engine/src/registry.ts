import type { WorkflowContract } from '@indra/contracts';

export class WorkflowRegistry {
  private static instance: WorkflowRegistry | null = null;
  private workflows: Map<string, WorkflowContract> = new Map();

  static getInstance(): WorkflowRegistry {
    if (!WorkflowRegistry.instance) {
      WorkflowRegistry.instance = new WorkflowRegistry();
    }
    return WorkflowRegistry.instance;
  }

  register(workflow: WorkflowContract): void {
    this.workflows.set(workflow.code, workflow);
  }

  get(code: string): WorkflowContract | undefined {
    return this.workflows.get(code);
  }

  list(): Array<{ code: string; title: string; category: string }> {
    return Array.from(this.workflows.values()).map((w) => ({
      code: w.code,
      title: w.title,
      category: w.category,
    }));
  }
}
