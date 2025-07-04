import { describe, it, expect } from "vitest";
import { HybridLogicalClock } from "./index.js";

describe("HybridLogicalClock", () => {
  it("should initialize with a given wall-clock time and a logical counter of 0", () => {
    const wallTime = 1672531200000; // 2023-01-01 00:00:00 UTC
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

      const newHlc = hlc.increment(initialTime);

      expect(newHlc.physicalTime).toBe(initialTime);
      expect(newHlc.logicalCounter).toBe(1);

      const newerHlc = newHlc.increment(initialTime);
      expect(newerHlc.physicalTime).toBe(initialTime);
      expect(newerHlc.logicalCounter).toBe(2);
    });
  });

  describe("update", () => {
    it("should adopt the remote timestamp if it is far ahead of the local clock", () => {
      const localHlc = HybridLogicalClock.fromWallTime(1000);
      const remoteHlc = HybridLogicalClock.fromWallTime(5000);
      const wallTime = 4999;
      const updatedHlc = localHlc.update(remoteHlc, wallTime);
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
      let localHlc = HybridLogicalClock.fromWallTime(5000);
      localHlc = localHlc.increment(5000);

      let remoteHlc = HybridLogicalClock.fromWallTime(5000);
      remoteHlc = remoteHlc.increment(5000);
      remoteHlc = remoteHlc.increment(5000);

      const wallTime = 4999;
      const updatedHlc = localHlc.update(remoteHlc, wallTime);

      expect(updatedHlc.physicalTime).toBe(5000);
      expect(updatedHlc.logicalCounter).toBe(3);
    });
  });
});
