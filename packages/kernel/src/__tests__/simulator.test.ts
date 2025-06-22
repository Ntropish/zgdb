import { Simulator } from "../simulator";

// Define a simple entity type for testing
type Position = { x: number; y: number };
type TestEntity = Simulator.Entity & { pos: Position };

describe("Simulator", () => {
  it("should create a simulator kernel", () => {
    const sim = Simulator.create();
    expect(sim).toBeDefined();
  });

  it("should add and get a typed entity", () => {
    const sim = Simulator.create<TestEntity>();
    const entity: TestEntity = { id: "e1", pos: { x: 10, y: 20 } };

    sim.add(entity);
    const retrieved = sim.get("e1");

    expect(retrieved).toBe(entity);
    expect(retrieved?.pos.x).toBe(10);
  });

  it("should return undefined for a non-existent entity", () => {
    const sim = Simulator.create<TestEntity>();
    expect(sim.get("non-existent")).toBeUndefined();
  });

  it("should get all entities", () => {
    const sim = Simulator.create<TestEntity>();
    const entity1: TestEntity = { id: "e1", pos: { x: 1, y: 2 } };
    const entity2: TestEntity = { id: "e2", pos: { x: 3, y: 4 } };

    sim.add(entity1);
    sim.add(entity2);

    const all = sim.getAll();

    expect(all).toHaveLength(2);
    expect(all).toContain(entity1);
    expect(all).toContain(entity2);
  });

  it("should run a system that updates entities", () => {
    const movementSystem: Simulator.System<TestEntity> = (entities, dt) => {
      for (const e of entities) {
        e.pos.x += 1 * dt;
      }
    };

    const sim = Simulator.create<TestEntity>({ systems: [movementSystem] });
    const entity: TestEntity = { id: "e1", pos: { x: 0, y: 0 } };
    sim.add(entity);

    // Manually call the internal tick method to simulate a single frame
    // We access it this way because it's a private method.
    (sim as any)["tick"]();

    // We can't know the exact dt, so we check if it changed from 0
    expect(entity.pos.x).toBeGreaterThan(0);

    // Stop the simulator to clear the timer set by the manual tick call.
    sim.stop();
  });

  it("should start and stop the simulation loop", () => {
    jest.useFakeTimers();
    const updateSpy = jest.fn();
    const testSystem: Simulator.System<TestEntity> = updateSpy;

    const sim = Simulator.create<TestEntity>({ systems: [testSystem] });

    // Should not be called before start
    expect(updateSpy).not.toHaveBeenCalled();

    sim.start();

    // The first tick is synchronous, so it should be called once.
    expect(updateSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);

    // More frames should have run after advancing time
    expect(updateSpy.mock.calls.length).toBeGreaterThan(1);

    sim.stop();
    const callCount = updateSpy.mock.calls.length;

    jest.advanceTimersByTime(100);

    // The call count should not increase after stopping
    expect(updateSpy.mock.calls.length).toBe(callCount);

    jest.useRealTimers();
  });
});
