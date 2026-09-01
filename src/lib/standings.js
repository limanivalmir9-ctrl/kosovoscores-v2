import { base44 } from '@/api/base44Client';

/**
 * Re-sequence stored `position` for every standing row in a competition
 * so the numbers are always 1, 2, 3, ... in chronological order.
 * Sort key: points → goal_difference → goals_for (same as the recalc functions).
 * Call this after any structural change (add/delete/transfer a club) so the
 * persisted positions stay in sync with what is displayed.
 */
export async function normalizeCompetitionPositions(competitionId) {
  if (!competitionId) return;
  const rows = await base44.entities.Standing.filter({ competition_id: competitionId }, 'position', 200);
  if (rows.length === 0) return;
  const sorted = [...rows].sort(
    (a, b) =>
      (b.points || 0) - (a.points || 0) ||
      (b.goal_difference || 0) - (a.goal_difference || 0) ||
      (b.goals_for || 0) - (a.goals_for || 0)
  );
  const updates = sorted.map((r, i) => ({ id: r.id, position: i + 1 }));
  await base44.entities.Standing.bulkUpdate(updates);
}