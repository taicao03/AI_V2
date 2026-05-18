import { Loader2 } from 'lucide-react';
import type { UserProfile } from '../types';
import { formatNumber } from '../lib/dice';

type PointsDisplayProps = {
  profile: UserProfile;
  compact?: boolean;
};

export function PointsDisplay({ profile, compact = false }: PointsDisplayProps) {
  const availablePoints = Math.max(0, profile.points - profile.locked_points);
  const syncing = profile.points_updated_at
    ? Date.now() - new Date(profile.points_updated_at).getTime() < 1800
    : false;

  return (
    <div className={compact ? 'points-pill' : 'points-panel'}>
      {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      <span>{formatNumber(availablePoints)} pts</span>
      {!compact && profile.locked_points > 0 && (
        <small>{formatNumber(profile.locked_points)} locked</small>
      )}
    </div>
  );
}
