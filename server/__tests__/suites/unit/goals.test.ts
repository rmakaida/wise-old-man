import { getGoalMeasure, getMilestoneThresholds, MAX_ACTIVE_GOALS, SKILL_EXP_AT_LEVEL, BOSS_KILL_MILESTONES } from '../../../src/api/modules/goals/goal.utils';
import { Metric } from '../../../src/types';

describe('Goal utils', () => {
  describe('getGoalMeasure', () => {
    test('returns experience for skills', () => {
      expect(getGoalMeasure(Metric.ATTACK)).toBe('experience');
      expect(getGoalMeasure(Metric.OVERALL)).toBe('experience');
      expect(getGoalMeasure(Metric.SLAYER)).toBe('experience');
    });

    test('returns kills for bosses', () => {
      expect(getGoalMeasure(Metric.ZULRAH)).toBe('kills');
      expect(getGoalMeasure(Metric.VORKATH)).toBe('kills');
      expect(getGoalMeasure(Metric.CERBERUS)).toBe('kills');
    });

    test('returns score for activities', () => {
      expect(getGoalMeasure(Metric.CLUE_SCROLLS_ALL)).toBe('score');
      expect(getGoalMeasure(Metric.LAST_MAN_STANDING)).toBe('score');
    });
  });

  describe('getMilestoneThresholds', () => {
    test('returns exp thresholds for skills', () => {
      const thresholds = getMilestoneThresholds(Metric.ATTACK);
      expect(thresholds).toEqual(Object.values(SKILL_EXP_AT_LEVEL));
      expect(thresholds.length).toBe(6);
      expect(thresholds).toContain(BigInt(13_034_431)); // level 99
      expect(thresholds).toContain(BigInt(200_000_000)); // level 200
    });

    test('returns kill thresholds for bosses', () => {
      const thresholds = getMilestoneThresholds(Metric.ZULRAH);
      expect(thresholds).toEqual(BOSS_KILL_MILESTONES);
      expect(thresholds).toContain(BigInt(1000));
    });

    test('returns empty array for activities', () => {
      const thresholds = getMilestoneThresholds(Metric.CLUE_SCROLLS_ALL);
      expect(thresholds).toEqual([]);
    });
  });

  describe('MAX_ACTIVE_GOALS', () => {
    test('is 10', () => {
      expect(MAX_ACTIVE_GOALS).toBe(10);
    });
  });

  describe('SKILL_EXP_AT_LEVEL', () => {
    test('has correct XP values for key levels', () => {
      expect(SKILL_EXP_AT_LEVEL[99]).toBe(BigInt(13_034_431));
      expect(SKILL_EXP_AT_LEVEL[50]).toBe(BigInt(101_333));
      expect(SKILL_EXP_AT_LEVEL[200]).toBe(BigInt(200_000_000));
    });
  });

  describe('BOSS_KILL_MILESTONES', () => {
    test('has correct milestones in ascending order', () => {
      expect(BOSS_KILL_MILESTONES[0]).toBe(BigInt(100));
      expect(BOSS_KILL_MILESTONES[BOSS_KILL_MILESTONES.length - 1]).toBe(BigInt(10_000));
      const sorted = [...BOSS_KILL_MILESTONES].sort((a, b) => (a < b ? -1 : 1));
      expect(BOSS_KILL_MILESTONES).toEqual(sorted);
    });
  });
});
