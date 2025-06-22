// ===================================================================
//
//                            The Simulator
//
// ===================================================================

export namespace Simulator {
  /** A simple base for any object in our simulation world. */
  export interface Entity {
    id: string;
  }

  /** A System is a function that contains the logic of the simulation. */
  export type System<TEntity extends Entity> = (
    entities: TEntity[],
    dt: number,
    kernel: Kernel<TEntity>,
    ctx?: any
  ) => void;

  /** The Kernel manages the simulation loop, entities, and systems. */
  export interface Kernel<TEntity extends Entity> {
    add(entity: TEntity): void;
    remove(id: string): void;
    clear(): void;
    get(id: string): TEntity | undefined;
    getAll(): TEntity[];
    start(): void;
    stop(): void;
  }

  class KernelImpl<TEntity extends Entity> implements Kernel<TEntity> {
    private systems: System<TEntity>[] = [];
    private entities: Map<string, TEntity> = new Map();
    private timerId: any | null = null;
    private lastTime: number = 0;
    private _ctx?: any;

    constructor(systems: System<TEntity>[], ctx?: any) {
      this.systems = systems;
      this._ctx = ctx;
    }

    public add(entity: TEntity): void {
      this.entities.set(entity.id, entity);
    }
    public remove(id: string): void {
      this.entities.delete(id);
    }
    public clear(): void {
      this.entities.clear();
    }
    public get(id: string): TEntity | undefined {
      return this.entities.get(id);
    }
    public getAll(): TEntity[] {
      return Array.from(this.entities.values());
    }
    public start(): void {
      if (this.timerId) return;
      this.lastTime =
        typeof performance === "undefined" ? Date.now() : performance.now();
      this.tick();
    }
    public stop(): void {
      if (this.timerId) {
        if (typeof cancelAnimationFrame === "function") {
          cancelAnimationFrame(this.timerId);
        } else {
          clearTimeout(this.timerId);
        }
        this.timerId = null;
      }
    }
    private tick = (): void => {
      const currentTime =
        typeof performance === "undefined" ? Date.now() : performance.now();
      const dt = (currentTime - this.lastTime) / 1000.0;
      this.lastTime = currentTime;
      const allEntities = this.getAll();
      for (const system of this.systems) {
        system(allEntities, dt, this, this._ctx);
      }
      if (typeof requestAnimationFrame === "function") {
        this.timerId = requestAnimationFrame(this.tick);
      } else {
        this.timerId = setTimeout(this.tick, 16);
      }
    };
  }

  /** Type for the default, untyped entity, preserving old behavior. */
  type AnyEntity = Entity & { [key: string]: any };

  /** Factory to create a new Simulator Kernel instance. */
  export function create<TEntity extends Entity = AnyEntity>({
    systems = [],
    ctx,
  }: {
    systems?: System<TEntity>[];
    ctx?: any;
  } = {}): Kernel<TEntity> {
    return new KernelImpl<TEntity>(systems, ctx);
  }
}
