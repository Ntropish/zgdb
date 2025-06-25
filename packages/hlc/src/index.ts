// Hybrid Logical Clock implementation will go here.

export class HybridLogicalClock {
  public readonly physicalTime: number;
  public readonly logicalCounter: number;

  private constructor(physicalTime: number, logicalCounter: number) {
    this.physicalTime = physicalTime;
    this.logicalCounter = logicalCounter;
  }

  public static fromWallTime(wallTime: number): HybridLogicalClock {
    return new HybridLogicalClock(wallTime, 0);
  }

  increment(currentWallTime: number): HybridLogicalClock {
    if (currentWallTime > this.physicalTime) {
      return new HybridLogicalClock(currentWallTime, 0);
    }

    return new HybridLogicalClock(this.physicalTime, this.logicalCounter + 1);
  }

  update(
    remote: HybridLogicalClock,
    currentWallTime: number
  ): HybridLogicalClock {
    const wall = currentWallTime;
    const localTime = this.physicalTime;
    const remoteTime = remote.physicalTime;

    const maxTime = Math.max(wall, localTime, remoteTime);

    if (maxTime === localTime && maxTime === remoteTime) {
      return new HybridLogicalClock(
        maxTime,
        Math.max(this.logicalCounter, remote.logicalCounter) + 1
      );
    }
    if (maxTime === localTime) {
      return new HybridLogicalClock(maxTime, this.logicalCounter + 1);
    }
    if (maxTime === remoteTime) {
      return new HybridLogicalClock(maxTime, remote.logicalCounter + 1);
    }
    // maxTime === wall
    return new HybridLogicalClock(maxTime, 0);
  }
}
