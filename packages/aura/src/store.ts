import { Reactor } from "@tsmk/kernel";
import { createEffect, Effect, effectStack } from "@tsmk/signals";
import { get, set, unset } from "lodash-es";

type AuraUpdateContext = {
  path: string;
  value: any;
};

type AuraContextMap = {
  update: AuraUpdateContext;
};

export class AuraStore<T extends object> {
  private state: T;
  private reactor: Reactor.Kernel<AuraContextMap>;
  private dependencies: Map<string, Set<Effect>> = new Map();

  constructor(initialState: T) {
    this.state = initialState;

    this.reactor = Reactor.create<AuraContextMap>({
      eventMap: {
        update: [
          (ctx: AuraUpdateContext) => {
            this.runDependencies(ctx.path);
          },
        ],
      },
    });
  }

  private track(path: string) {
    const currentEffect = effectStack[effectStack.length - 1];
    if (currentEffect) {
      if (!this.dependencies.has(path)) {
        this.dependencies.set(path, new Set());
      }
      this.dependencies.get(path)!.add(currentEffect);
    }
  }

  private runDependencies(path: string) {
    const effects = this.dependencies.get(path);
    if (effects) {
      effects.forEach((effect) => createEffect(effect));
    }
  }

  public get(path: string): any {
    this.track(path);
    return get(this.state, path);
  }

  public async set(path: string, value: any): Promise<void> {
    set(this.state, path, value);
    await this.reactor.trigger("update", { path, value });
  }

  public async delete(path: string): Promise<void> {
    unset(this.state, path);
    // Trigger updates for the path and potentially parent paths
    await this.reactor.trigger("update", { path, value: undefined });
  }

  public getState(): T {
    return this.state;
  }
}
