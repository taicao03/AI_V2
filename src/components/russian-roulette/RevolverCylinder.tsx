import { motion } from 'framer-motion';
import { Target, ShieldAlert, Crosshair, HelpCircle, ShieldCheck } from 'lucide-react';
import type { RRRound } from '../../types/russianRoulette';

type RevolverCylinderProps = {
  round: RRRound | null;
  status: string;
};

export function RevolverCylinder({ round, status }: RevolverCylinderProps) {
  const triggerCount = round?.trigger_count ?? 0;
  const isPlaying = status === 'playing' && round?.status === 'playing';

  // Revolver cylinder has 6 chambers
  const chambers = Array.from({ length: 6 }, (_, i) => {
    let state: 'safe' | 'active' | 'unknown' = 'unknown';
    
    if (isPlaying) {
      if (i < triggerCount) {
        state = 'safe'; // Trigger already pulled for this chamber, it was safe!
      } else if (i === triggerCount) {
        state = 'active'; // Lined up with the hammer! Suspense is high!
      }
    }
    
    // Position each chamber in a circle
    const angle = (i * 360) / 6;
    const radius = 56; // Radius of chamber positions in px
    const x = Math.sin((angle * Math.PI) / 180) * radius;
    const y = -Math.cos((angle * Math.PI) / 180) * radius;

    return { index: i, x, y, state, angle };
  });

  // Calculate rotation angle of the cylinder
  // We want the active chamber (chambers[triggerCount]) to always rotate to the top (0 degrees)
  const cylinderRotation = isPlaying ? -(triggerCount * 360) / 6 : 0;

  // Exact explosive probability
  const explosionOdds = isPlaying ? Math.round((1 / (6 - triggerCount)) * 100) : 0;

  return (
    <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#060a15] via-[#090f1d] to-[#040813] p-5 sm:p-6 h-full flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden group">
      {/* Blueprint Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
      
      {/* Title */}
      <div className="text-center mb-4 z-10 w-full">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-400 block">GIÁM SÁT Ổ SÚNG</span>
        <h4 className="text-sm font-black text-white uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1.5 font-display">
          <Crosshair size={14} className="text-cyan-400 animate-pulse" />
          Ổ ĐẠN XOAY PHÁT QUANG
        </h4>
      </div>

      {/* Main Cylinder Visual Wrapper */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-4 z-10">
        {/* Outer Scope Compass ticks and labels */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/30 bg-cyan-950/5 shadow-[0_0_25px_rgba(34,211,238,0.15)] flex items-center justify-center" />
        <div className="absolute w-[92%] h-[92%] rounded-full border border-dashed border-cyan-500/10 pointer-events-none" />
        
        {/* Gun Scope crosshair ticks (Outer Ring Decoration) */}
        <svg className="absolute w-full h-full pointer-events-none opacity-45" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(34,211,238,0.15)" strokeWidth="0.5" />
          <line x1="50" y1="2" x2="50" y2="6" stroke="rgba(244,63,94,0.6)" strokeWidth="0.8" />
          <line x1="50" y1="94" x2="50" y2="98" stroke="rgba(34,211,238,0.5)" strokeWidth="0.5" />
          <line x1="2" y1="50" x2="6" y2="50" stroke="rgba(34,211,238,0.5)" strokeWidth="0.5" />
          <line x1="94" y1="50" x2="98" y2="50" stroke="rgba(34,211,238,0.5)" strokeWidth="0.5" />
          
          {/* Subtle degrees text decoration */}
          <text x="47" y="11" fill="rgba(244,63,94,0.6)" className="text-[3px] font-black font-mono">000°</text>
          <text x="86" y="51" fill="rgba(34,211,238,0.4)" className="text-[3px] font-black font-mono">090°</text>
          <text x="47" y="92" fill="rgba(34,211,238,0.4)" className="text-[3px] font-black font-mono">180°</text>
          <text x="8" y="51" fill="rgba(34,211,238,0.4)" className="text-[3px] font-black font-mono">270°</text>
        </svg>

        {/* Gun Barrel Sight indicator at the very top (12 o'clock / Active Hammer) */}
        <div className="absolute -top-1.5 z-30 flex flex-col items-center">
          <motion.div 
            animate={{ y: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-rose-500 filter drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" 
          />
          <span className="text-[7px] font-extrabold text-rose-400 uppercase tracking-widest bg-rose-950/90 px-1.5 py-0.5 border border-rose-500/30 rounded mt-1.5 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
            KIM HỎA
          </span>
        </div>

        {/* Cylinder Body (Spins with Framer Motion) */}
        <motion.div
          animate={{ rotate: cylinderRotation }}
          transition={{ type: 'spring', damping: 22, stiffness: 85 }}
          className="relative w-38 h-38 rounded-full bg-slate-900 border border-slate-700/60 shadow-[inset_0_0_30px_rgba(0,0,0,0.85),0_4px_20px_rgba(0,0,0,0.7)] flex items-center justify-center"
        >
          {/* Metal grooves for style */}
          <div className="absolute w-[60%] h-[60%] rounded-full border border-slate-800 bg-[#0c1326]/75 shadow-inner" />
          
          {/* Individual Chambers */}
          {chambers.map((ch) => {
            const isSafe = ch.state === 'safe';
            const isActive = ch.state === 'active';

            return (
              <div
                key={ch.index}
                className="absolute w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  transform: `translate(${ch.x}px, ${ch.y}px)`,
                }}
              >
                {/* Chamber metallic hole outline */}
                <div className="absolute inset-0 rounded-full bg-black shadow-[inset_0_3px_6px_rgba(0,0,0,0.95)] border border-slate-800" />

                {/* Inner status visual */}
                {isSafe ? (
                  // Safe chamber (green glow tick)
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-[88%] h-[88%] rounded-full bg-emerald-500/10 border border-emerald-500/60 shadow-[inset_0_0_8px_rgba(16,185,129,0.3),0_0_12px_rgba(16,185,129,0.4)] flex items-center justify-center text-emerald-400 font-black text-[9px] uppercase tracking-tighter"
                  >
                    AN TOÀN
                  </motion.div>
                ) : isActive ? (
                  // WARNING next chamber lined up at hammer (red/orange warning shield alert)
                  <motion.div 
                    animate={{ 
                      scale: [0.92, 1.05, 0.92],
                      boxShadow: [
                        '0 0 6px rgba(239,68,68,0.25), inset 0 0 4px rgba(239,68,68,0.25)',
                        '0 0 20px rgba(239,68,68,0.7), inset 0 0 12px rgba(239,68,68,0.5)',
                        '0 0 6px rgba(239,68,68,0.25), inset 0 0 4px rgba(239,68,68,0.25)'
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-[90%] h-[90%] rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400"
                  >
                    <Target size={14} className="animate-spin-slow" />
                  </motion.div>
                ) : (
                  // Locked/Untested chamber (mysterious cyan aura)
                  <div className="w-[80%] h-[80%] rounded-full bg-slate-950/50 border border-slate-800 text-slate-600 flex items-center justify-center">
                    <HelpCircle size={10} className="text-slate-700" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Central Revolver Pin */}
          <div className="absolute w-8.5 h-8.5 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-slate-600 shadow-[0_3px_5px_rgba(0,0,0,0.6)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-black shadow-inner" />
          </div>
        </motion.div>
      </div>

      {/* Info Stats Bar */}
      <div className="w-full flex items-center justify-around rounded-2xl bg-slate-950/65 border border-white/5 py-2.5 px-4 z-10">
        <div className="text-center">
          <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Lượt Đã Bắn</span>
          <span className="text-sm font-black text-cyan-400 tracking-wide font-display">{triggerCount} / 6</span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Tỉ lệ kích nổ</span>
          <span className={`text-sm font-black tracking-wide font-display ${explosionOdds > 30 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {isPlaying ? `${explosionOdds}%` : '0%'}
          </span>
        </div>
      </div>
    </div>
  );
}
