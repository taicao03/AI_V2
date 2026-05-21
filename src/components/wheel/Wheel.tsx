import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import type { WheelSegment, WheelSpin } from '../../types/wheel';

type WheelProps = {
  segments: WheelSegment[];
  spin: WheelSpin | null;
  spinning: boolean;
};

type SegmentArc = {
  segment: WheelSegment;
  start: number;
  end: number;
  center: number;
  sweep: number;
};

function normalizeAngle(value: number): number {
  let angle = value % 360;
  if (angle < 0) {
    angle += 360;
  }
  return angle;
}

const WheelImpl = ({ segments, spin, spinning }: WheelProps) => {
  const enabledSegments = useMemo(
    () => [...segments].filter((segment) => segment.enabled && segment.probability > 0).sort((a, b) => a.sort_order - b.sort_order),
    [segments],
  );

  const arcsByIndex = useMemo<SegmentArc[]>(() => {
    if (enabledSegments.length === 0) {
      return [];
    }

    const sweep = 360 / enabledSegments.length;
    const halfSweep = sweep / 2;
    return enabledSegments.map((segment, index) => {
      const start = index * sweep;
      const end = start + sweep;
      const center = start + halfSweep;
      return { segment, start, end, center, sweep };
    });
  }, [enabledSegments]);

  const gradient = useMemo(() => {
    if (arcsByIndex.length === 0) {
      return 'conic-gradient(from 0deg, #334155 0deg 360deg)';
    }

    const sweep = arcsByIndex[0].sweep;
    const chunks = arcsByIndex.map((arc, index) => `${arc.segment.color} ${index * sweep}deg ${(index + 1) * sweep}deg`);
    return `conic-gradient(from 0deg, ${chunks.join(', ')})`;
  }, [arcsByIndex]);

  const [rotation, setRotation] = useState(0);
  const hasInitializedRef = useRef(false);
  const lastAnimatedSpinIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (arcsByIndex.length === 0) {
      return;
    }

    if (!spin) {
      const sweep = arcsByIndex[0].sweep;
      const halfSweep = sweep / 2;
      if (!hasInitializedRef.current) {
        setRotation(-halfSweep);
        hasInitializedRef.current = true;
      }
      return;
    }

    if (lastAnimatedSpinIdRef.current === spin.spin_id) {
      return;
    }

    const target = arcsByIndex.find((arc) => arc.segment.segment_id === spin.selected_segment_id);
    if (!target) {
      return;
    }

    lastAnimatedSpinIdRef.current = spin.spin_id;

    setRotation((current) => {
      const currentNormalized = normalizeAngle(current);
      const targetAngle = normalizeAngle(360 - target.center);
      const delta = normalizeAngle(targetAngle - currentNormalized);
      const extraTurns = 6 * 360;
      return current + extraTurns + delta;
    });
  }, [arcsByIndex, spin?.spin_id, spin?.selected_segment_id]);

  // Calculate 24 LED dots positioned on the outer rim of the wheel using polar coordinates
  const ledDots = useMemo(() => {
    const radius = 48.2; // Percentage radius from the center
    return Array.from({ length: 24 }).map((_, i) => {
      const angle = (i * 360) / 24;
      const rad = (angle * Math.PI) / 180;
      const left = 50 + radius * Math.sin(rad);
      const top = 50 - radius * Math.cos(rad);
      return { id: i, left, top, angle };
    });
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px] select-none p-[8px]">
      {/* Ticker / Mechanical Pointer at the top */}
      <div 
        className="absolute left-1/2 top-[-10px] z-30 -translate-x-1/2 pointer-events-none transition-all duration-300"
        style={{
          animation: spinning ? 'pointer-wiggle 0.09s infinite alternate ease-in-out' : 'none',
          transformOrigin: '50% 10px',
        }}
      >
        <svg width="38" height="48" viewBox="0 0 38 48" className="drop-shadow-[0_0_12px_rgba(236,72,153,0.85)]">
          <path 
            d="M19 44 L5 12 A3 3 0 0 1 8 7 L30 7 A3 3 0 0 1 33 12 Z" 
            fill="url(#ticker-grad)" 
            stroke="#ec4899" 
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="19" cy="14" r="4" fill="#ffffff" className="animate-pulse" />
          <defs>
            <linearGradient id="ticker-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Wheel Core Wrapper */}
      <div className="relative h-full w-full rounded-full p-[10px] bg-gradient-to-b from-white/10 to-black/40 shadow-[0_0_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] border border-white/10">
        
        {/* Glowing Rim Background */}
        <div className="absolute inset-[8px] rounded-full bg-cyan-950/20 blur-[15px] pointer-events-none" />

        {/* The Spinning Wheel Canvas */}
        <div
          className="absolute inset-[10px] rounded-full border-[6px] border-slate-900 shadow-[0_0_35px_rgba(0,0,0,0.8),0_0_40px_rgba(34,211,238,0.12),inset_0_0_20px_rgba(0,0,0,0.6)] overflow-hidden"
          style={{
            backgroundImage: gradient,
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? 'transform 9800ms cubic-bezier(0.08, 0.88, 0.14, 1)'
              : 'transform 900ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Segment boundaries (Dividers) */}
          {arcsByIndex.map((arc) => (
            <div
              key={`divider-${arc.segment.segment_id}`}
              className="absolute left-1/2 top-0 bottom-1/2 w-[1.5px] bg-black/35 origin-bottom pointer-events-none"
              style={{
                transform: `translateX(-50%) rotate(${arc.start}deg)`,
              }}
            />
          ))}

          {/* Radially Oriented Text Labels */}
          {arcsByIndex.map((arc) => (
            <div
              key={arc.segment.segment_id}
              className="pointer-events-none absolute left-1/2 top-1/2 h-6 flex items-center justify-end"
              style={{
                width: '42%',
                transformOrigin: '0% 50%',
                transform: `translate(0%, -50%) rotate(${arc.center - 90}deg)`,
                paddingRight: '14px',
              }}
            >
              <span
                className="text-[9px] sm:text-[11px] font-black uppercase text-white tracking-[0.08em] select-none text-right block"
                style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.8)',
                }}
              >
                {arc.segment.label}
              </span>
            </div>
          ))}
        </div>

        {/* LED Lights around the Rim */}
        <div className="absolute inset-0 pointer-events-none">
          {ledDots.map((dot) => {
            const isCyan = dot.id % 2 === 0;
            return (
              <div
                key={dot.id}
                className="absolute w-[7px] h-[7px] rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                style={{
                  left: `${dot.left}%`,
                  top: `${dot.top}%`,
                  backgroundColor: spinning 
                    ? (isCyan ? '#22d3ee' : '#ec4899') 
                    : '#22d3ee',
                  boxShadow: spinning
                    ? `0 0 6px ${isCyan ? '#22d3ee' : '#ec4899'}, 0 0 12px ${isCyan ? '#22d3ee' : '#ec4899'}`
                    : '0 0 4px #22d3ee, 0 0 8px #22d3ee',
                  animation: spinning 
                    ? `led-chase-fast 0.5s linear infinite` 
                    : `led-pulse 2s ease-in-out infinite`,
                  animationDelay: `${(dot.id * 0.06).toFixed(2)}s`
                }}
              />
            );
          })}
        </div>

        {/* Multi-layered Cyber Center Hub */}
        <div className="absolute left-1/2 top-1/2 z-10 h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-slate-900 bg-[#020617] shadow-[0_0_30px_rgba(0,0,0,0.8),0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center">
          {/* Rotating high-tech ring overlay */}
          <div className="absolute inset-[3px] rounded-full border border-dashed border-cyan-400/30 animate-spin-slow pointer-events-none" />
          
          {/* Inner ring */}
          <div className="absolute inset-[6px] rounded-full bg-gradient-to-b from-[#0a122c] to-[#040714] border border-cyan-500/20 flex flex-col items-center justify-center shadow-[inset_0_2px_8px_rgba(34,211,238,0.2)]">
            <Zap size={16} className="text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            <div className="mt-1 text-[8px] font-black uppercase tracking-[0.25em] text-cyan-300">
              SPIN
            </div>
          </div>
        </div>
      </div>

      {/* Embedded local animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pointer-wiggle {
          0% { transform: translateX(-50%) rotate(-6deg); }
          100% { transform: translateX(-50%) rotate(8deg); }
        }
        @keyframes led-chase-fast {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.8) scale(1.15); }
        }
        @keyframes led-pulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.9); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
      ` }} />
    </div>
  );
};

export const Wheel = memo(WheelImpl);
Wheel.displayName = 'Wheel';


