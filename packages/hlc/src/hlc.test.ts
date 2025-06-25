import { HybridLogicalClock } from "./index";

describe("HybridLogicalClock", () => {
  it("should be defined", () => {
    // This will fail until we create the class
    expect(HybridLogicalClock).toBeDefined();
  });

  it("should initialize with a given wall-clock time and a logical counter of 0", () => {
    const wallTime = 1672531200000; // A fixed point in time: 2023-01-01 00:00:00 UTC
    const hlc = HybridLogicalClock.fromWallTime(wallTime);
    expect(hlc.physicalTime).toBe(wallTime);
    expect(hlc.logicalCounter).toBe(0);
  });

  describe("increment", () => {
    it("should update to the current wall-time and reset the counter if the wall-time is greater", () => {
      const initialTime = 1672531200000;
      const hlc = HybridLogicalClock.fromWallTime(initialTime);

      const advancedTime = initialTime + 1000;
      const newHlc = hlc.increment(advancedTime);

      expect(newHlc.physicalTime).toBe(advancedTime);
      expect(newHlc.logicalCounter).toBe(0);
    });

    it("should increment the logical counter if the wall-time is the same or older", () => {
      const initialTime = 1672531200000;
      const hlc = HybridLogicalClock.fromWallTime(initialTime);

      // Pass the same time to simulate a rapid sequence of events
      const newHlc = hlc.increment(initialTime);

      expect(newHlc.physicalTime).toBe(initialTime);
      expect(newHlc.logicalCounter).toBe(1);

      // Check that it increments again
      const newerHlc = newHlc.increment(initialTime);
      expect(newerHlc.physicalTime).toBe(initialTime);
      expect(newerHlc.logicalCounter).toBe(2);
    });
  });

  describe("update", () => {
    it("should adopt the remote timestamp if it is far ahead of the local clock", () => {
      const localHlc = HybridLogicalClock.fromWallTime(1000); // Local clock at time 1000
      const remoteHlc = HybridLogicalClock.fromWallTime(5000); // Remote clock at time 5000

      // The current wall time is now behind the remote clock, isolating the remote-as-max case
      const wallTime = 4999;
      const updatedHlc = localHlc.update(remoteHlc, wallTime);

      // It should adopt the remote's physical time and increment its logical counter
      expect(updatedHlc.physicalTime).toBe(remoteHlc.physicalTime);
      expect(updatedHlc.logicalCounter).toBe(remoteHlc.logicalCounter + 1);
    });

    it("should use the local timestamp if it is ahead of the remote clock", () => {
      const localHlc = HybridLogicalClock.fromWallTime(5000);
      const remoteHlc = HybridLogicalClock.fromWallTime(1000);
      const wallTime = 4999;
      const updatedHlc = localHlc.update(remoteHlc, wallTime);
      expect(updatedHlc.physicalTime).toBe(localHlc.physicalTime);
      expect(updatedHlc.logicalCounter).toBe(localHlc.logicalCounter + 1);
    });

    it("should use the wall-clock time if it is ahead of both local and remote", () => {
      const localHlc = HybridLogicalClock.fromWallTime(1000);
      const remoteHlc = HybridLogicalClock.fromWallTime(2000);
      const wallTime = 5000;
      const updatedHlc = localHlc.update(remoteHlc, wallTime);
      expect(updatedHlc.physicalTime).toBe(wallTime);
      expect(updatedHlc.logicalCounter).toBe(0);
    });

    it("should increment the max logical counter when physical times are identical", () => {
      // Create two clocks with the same physical time but different logical counters
      let localHlc = HybridLogicalClock.fromWallTime(5000); // counter is 0
      localHlc = localHlc.increment(5000); // counter is 1

      let remoteHlc = HybridLogicalClock.fromWallTime(5000); // counter is 0
      remoteHlc = remoteHlc.increment(5000); // counter is 1
      remoteHlc = remoteHlc.increment(5000); // counter is 2

      const wallTime = 4999; // Wall time is behind
      const updatedHlc = localHlc.update(remoteHlc, wallTime);

      expect(updatedHlc.physicalTime).toBe(5000);
      // It should take the max of the two counters (2) and add 1
      expect(updatedHlc.logicalCounter).toBe(3);
    });
  });
});
