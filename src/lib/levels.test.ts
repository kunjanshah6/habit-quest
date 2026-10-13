import { describe, expect, it } from 'vitest';
import { LEVELS, getLevelInfo } from './levels';

describe('getLevelInfo', () => {
  it('returns level 1 for 0 XP', () => {
    expect(getLevelInfo(0).level).toBe(1);
  });

  it('returns level 1 for negative XP', () => {
    expect(getLevelInfo(-50).level).toBe(1);
  });

  it('stays on the current level just below a threshold', () => {
    expect(getLevelInfo(199).level).toBe(1);
  });

  it('advances exactly at the threshold', () => {
    expect(getLevelInfo(200).level).toBe(2);
    expect(getLevelInfo(6500).level).toBe(10);
  });

  it('handles the top levels', () => {
    expect(getLevelInfo(99_999).level).toBe(25);
    expect(getLevelInfo(100_000).level).toBe(50);
    expect(getLevelInfo(10_000_000).level).toBe(50);
  });

  it('has contiguous XP ranges with no gaps or overlaps', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].minXP).toBe(LEVELS[i - 1].maxXP);
    }
  });
});
