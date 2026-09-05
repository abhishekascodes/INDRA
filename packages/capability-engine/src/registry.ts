import type { CapabilityContract } from '@indra/contracts';

export class CapabilityRegistry {
  private static instance: CapabilityRegistry | null = null;
  private capabilities: Map<string, CapabilityContract<any, any>> = new Map();

  static getInstance(): CapabilityRegistry {
    if (!CapabilityRegistry.instance) {
      CapabilityRegistry.instance = new CapabilityRegistry();
    }
    return CapabilityRegistry.instance;
  }

  register<TInput, TOutput>(capability: CapabilityContract<TInput, TOutput>): void {
    if (this.capabilities.has(capability.id)) {
      console.warn(`[CapabilityRegistry] Overwriting capability: ${capability.id}`);
    }
    this.capabilities.set(capability.id, capability);
  }

  get<TInput = unknown, TOutput = unknown>(
    id: string
  ): CapabilityContract<TInput, TOutput> | undefined {
    return this.capabilities.get(id);
  }

  has(id: string): boolean {
    return this.capabilities.has(id);
  }

  list(): Array<{ id: string; version: string; name: string; domain: string; sideEffect: string }> {
    return Array.from(this.capabilities.values()).map((c) => ({
      id: c.id,
      version: c.version,
      name: c.humanName,
      domain: c.domain,
      sideEffect: c.sideEffectClass,
    }));
  }

  getAll(): CapabilityContract<any, any>[] {
    return Array.from(this.capabilities.values());
  }
}
