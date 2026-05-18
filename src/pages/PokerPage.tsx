import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Eye, LogIn, PlusCircle, RefreshCw, Users, Copy, Check, Send, Award, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { formatNumber } from '../lib/dice';
import { pointsService } from '../services/pointsService';
import { pokerService } from '../services/pokerService';
import { tableService } from '../services/tableService';
import { chatService } from '../services/chatService';
import type { PokerHand, PokerLeaderboardEntry, PokerPlayer, PokerTableLobbyItem, PokerTableState, UserProfile } from '../types';

type PokerPageProps = {
  profile: UserProfile | null;
  sessionToken: string | null;
  onSignInClick: () => void;
};

function secondsUntil(value: string | null): number {
  if (!value) {
    return 0;
  }
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));
}

// Map of seat numbers to responsive absolute coordinates (capsule on mobile, oval on desktop)
const RESPONSIVE_SEAT_POSITIONS: Record<number, string> = {
  1: "top-0 left-[28%] sm:left-[20%] -translate-y-1/2 -translate-x-1/2",
  2: "top-0 left-[72%] sm:left-[80%] -translate-y-1/2 -translate-x-1/2",
  3: "top-1/2 right-0 -translate-y-1/2 translate-x-[12%] sm:translate-x-1/2",
  4: "bottom-0 left-[72%] sm:left-[80%] translate-y-1/2 -translate-x-1/2",
  5: "bottom-0 left-[28%] sm:left-[20%] translate-y-1/2 -translate-x-1/2",
  6: "top-1/2 left-0 -translate-y-1/2 -translate-x-[12%] sm:-translate-x-1/2",
};

function getSeatClass(seatOrder: number | null): string {
  const order = seatOrder ?? 1;
  const index = ((order - 1) % 6) + 1;
  return RESPONSIVE_SEAT_POSITIONS[index] || RESPONSIVE_SEAT_POSITIONS[1];
}

// Casino-quality Realistic Card Component
function PlayingCard({ card, size = 'md' }: { card: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'responsive' }) {
  if (card === 'XX') {
    // Cyber-styled elegant card back
    const heightClass = 
      size === 'lg' ? 'h-20 w-14' : 
      size === 'md' ? 'h-16 w-11' : 
      size === 'sm' ? 'h-12 w-8.5' : 
      size === 'xs' ? 'h-8 w-6' :
      'h-10 w-7 xs:h-11 xs:w-8 sm:h-16 sm:w-11 lg:h-20 lg:w-14';

    const fontClass = 
      size === 'lg' ? 'text-[9px]' : 
      size === 'md' ? 'text-[8px]' : 
      size === 'sm' ? 'text-[7px]' : 
      size === 'xs' ? 'text-[5px]' :
      'text-[5px] sm:text-[8px] lg:text-[9px]';

    return (
      <div className={`relative flex ${heightClass} shrink-0 items-center justify-center rounded-md sm:rounded-lg border border-cyan-500/30 bg-gradient-to-br from-[#0c1b33] to-[#020617] shadow-[0_0_12px_rgba(34,211,238,0.25)] overflow-hidden`}>
        {/* Hologram card backing pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(34,211,238,0.1)_50%,transparent_55%)] bg-[length:150%_150%] animate-pulse" />
        <div className="absolute inset-0.5 rounded-[3px] sm:rounded-[5px] border border-cyan-500/10 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.15)_0%,_transparent_75%)] flex flex-col items-center justify-center">
          <span className={`${fontClass} font-black text-cyan-400 tracking-widest uppercase scale-75`}>CYBER</span>
          <span className="text-[5px] sm:text-[6px] text-cyan-500/60 font-mono tracking-tighter uppercase scale-75 mt-0.5">ARENA</span>
        </div>
      </div>
    );
  }

  const rank = card.slice(0, card.length - 1);
  const suit = card.slice(-1);
  const isRed = suit === 'H' || suit === 'D';
  const suitChar = suit === 'S' ? '♠' : suit === 'H' ? '♥' : suit === 'D' ? '♦' : '♣';
  const rankStr = rank === 'T' ? '10' : rank;

  const heightClass = 
    size === 'lg' ? 'h-20 w-14 p-1.5' : 
    size === 'md' ? 'h-16 w-11 p-1' : 
    size === 'sm' ? 'h-12 w-8.5 p-0.5' : 
    size === 'xs' ? 'h-8 w-6 p-0.5' :
    'h-10 w-7 p-0.5 xs:h-11 xs:w-8 sm:h-16 sm:w-11 sm:p-1 lg:h-20 lg:w-14 lg:p-1.5';

  const rankFont = 
    size === 'lg' ? 'text-xs' : 
    size === 'md' ? 'text-[10px]' : 
    size === 'sm' ? 'text-[8px]' : 
    size === 'xs' ? 'text-[6px]' :
    'text-[6px] sm:text-[10px] lg:text-xs';

  const suitFont = 
    size === 'lg' ? 'text-2xl -mt-1' : 
    size === 'md' ? 'text-lg -mt-1' : 
    size === 'sm' ? 'text-xs -mt-0.5' : 
    size === 'xs' ? 'text-[9px] -mt-1' :
    'text-[9px] -mt-1 sm:text-lg sm:-mt-1 lg:text-2xl';

  return (
    <div className={`relative flex ${heightClass} shrink-0 flex-col justify-between rounded-md sm:rounded-lg border border-slate-300 bg-gradient-to-b from-white to-slate-100 font-sans font-black shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_8px_16px_rgba(0,0,0,0.5)] ${
      isRed ? 'text-rose-600' : 'text-slate-900'
    }`}>
      <div className={`${rankFont} text-left leading-none tracking-tight`}>{rankStr}</div>
      <div className={`${suitFont} text-center leading-none`}>{suitChar}</div>
      <div className={`${rankFont} text-right leading-none rotate-180 tracking-tight`}>{rankStr}</div>
    </div>
  );
}

// Floating Bet felt offset coordinates based on seat number
const FLOATING_BET_POSITIONS: Record<number, string> = {
  1: "top-full left-1/2 mt-1 sm:mt-2 -translate-x-1/4 sm:translate-x-4",
  2: "top-full right-1/2 mt-1 sm:mt-2 translate-x-1/4 sm:-translate-x-4",
  3: "top-1/2 right-full mr-2 sm:mr-3 -translate-y-1/2",
  4: "bottom-full right-1/2 mb-1 sm:mb-2 translate-x-1/4 sm:-translate-x-4",
  6: "top-1/2 left-full ml-2 sm:ml-3 -translate-y-1/2",
};

// Premium Seat Card Component for Active Players
function SeatCard({
  player,
  hand,
  isMe,
  isHost,
  canKick,
  onKick,
}: {
  player: PokerPlayer;
  hand: PokerHand | null;
  isMe: boolean;
  isHost: boolean;
  canKick: boolean;
  onKick?: () => void;
}) {
  const [showInfoMobile, setShowInfoMobile] = useState(false);

  const isFolded = player.player_status === 'folded';
  const isAllIn = player.player_status === 'all-in';
  const isThinking = player.player_status === 'thinking';
  const isReady = player.is_ready;

  const cards = hand?.cards ?? ['XX', 'XX', 'XX'];
  const stack = Math.max(0, player.available_points ?? 0);

  const initial = (player.display_name ?? player.user_id).slice(0, 1).toUpperCase();
  const seatIndex = ((player.seat_order ?? 1) - 1) % 6 + 1;

  const borderClass = isFolded
    ? 'border-slate-800 opacity-50 grayscale saturate-50 shadow-none'
    : hand?.is_winner
      ? 'border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.5)] scale-[1.02]'
      : isThinking
        ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.45)] animate-pulse scale-[1.02] z-10'
        : isMe
          ? 'border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
          : 'border-white/5 hover:border-cyan-500/10';

  return (
    <div className="relative overflow-visible">
      {/* Floating bet badge on the felt */}
      {player.round_bet && player.round_bet > 0 ? (
        <div className={`absolute ${FLOATING_BET_POSITIONS[seatIndex] || FLOATING_BET_POSITIONS[1]} z-20 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-2 py-0.5 text-[8px] sm:text-[10px] font-black text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] border border-yellow-300/30 whitespace-nowrap`}>
          <span>🪙</span>
          <span>{formatNumber(player.round_bet)}</span>
        </div>
      ) : null}

      <motion.div
        className={`relative w-14 xs:w-16 sm:w-36 lg:w-44 rounded-xl sm:rounded-2xl border bg-[#0b1020]/90 p-1 sm:p-2.5 lg:p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 overflow-visible ${borderClass}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        {/* Glow highlight for active turn */}
        {isThinking && (
          <div className="absolute inset-0 -m-px rounded-xl sm:rounded-2xl border border-cyan-400/20 bg-cyan-400/5 pointer-events-none animate-pulse" />
        )}

        {/* Clickable Avatar area on mobile, standard layout on desktop */}
        <div 
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 min-w-0 cursor-pointer overflow-visible"
          onClick={() => setShowInfoMobile(!showInfoMobile)}
          title="Click to view info"
        >
          <div className={`relative flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full font-black text-[10px] sm:text-xs shadow-inner transition-all duration-300 ${
            isMe
              ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
              : player.is_bot
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border border-amber-400'
                : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 border border-cyan-400'
          }`}>
            {initial}
          </div>

          <div className="hidden sm:block min-w-0 flex-1 leading-tight">
            <div className={`truncate font-black text-[9px] sm:text-[10px] lg:text-xs tracking-tight ${isMe ? 'text-purple-300' : 'text-cyan-300'}`}>
              {player.display_name ?? player.user_id.slice(0, 8)}
            </div>
            <div className="font-extrabold text-[8px] sm:text-[9px] lg:text-[10px] text-emerald-400 mt-0.5 truncate">
              💰 {formatNumber(stack)}
            </div>
          </div>

          {/* Quick-peek stack on mobile just below avatar */}
          <div className="sm:hidden text-[7px] font-black text-emerald-400 truncate max-w-full">
            {formatNumber(stack)}
          </div>
        </div>

        {/* Status Line - Desktop Only */}
        <div className="hidden sm:flex items-center justify-between text-[7px] sm:text-[8px] lg:text-[9px] tracking-wider uppercase text-slate-400 border-t border-white/5 pt-1.5 mt-1.5">
          <span className={`font-black ${
            isFolded 
              ? 'text-rose-400' 
              : isAllIn 
                ? 'text-purple-400 animate-pulse' 
                : isThinking 
                  ? 'text-cyan-400 animate-pulse' 
                  : isReady 
                    ? 'text-emerald-400' 
                    : 'text-slate-400'
          }`}>
            {isFolded ? 'FOLDED' : isAllIn ? 'ALL-IN' : isThinking ? 'THINKING' : isReady ? 'READY' : (player.player_status ?? 'WAITING')}
          </span>
          
          <div className="flex items-center gap-1">
            {isHost && (
              <span className="text-[6px] sm:text-[7px] font-black uppercase text-yellow-300">
                Host
              </span>
            )}
            {player.is_bot && (
              <span className="text-[6px] sm:text-[7px] font-black uppercase text-amber-300">
                NPC
              </span>
            )}
            <span className="text-[6px] sm:text-[7px] text-slate-500 font-bold">
              S{player.seat_order}
            </span>
          </div>
        </div>

        {player.is_bot && player.npc_personality && (
          <div className="hidden sm:block mt-1 rounded bg-amber-500/5 border border-amber-500/15 py-0.5 text-[6px] sm:text-[8px] font-semibold uppercase tracking-wider text-amber-300 text-center truncate">
            🤖 {player.npc_personality}
          </div>
        )}

        {canKick && onKick && (
          <button
            type="button"
            className="hidden sm:block mt-1.5 w-full rounded border border-rose-500/30 bg-rose-500/10 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all"
            onClick={onKick}
          >
            Kick Player
          </button>
        )}

        {/* Realistic cards flex - Opponent cards are ALWAYS visible on mobile & desktop! */}
        {!isMe && (
          <>
            <div className="flex gap-0.5 justify-center border-t border-white/5 pt-1 mt-1 sm:pt-1.5 sm:mt-1.5">
              {cards.slice(0, 3).map((card, index) => (
                <motion.div
                  key={`${player.user_id}-${index}-${card}`}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <PlayingCard card={card} size="responsive" />
                </motion.div>
              ))}
            </div>

            {hand?.hand_name && (
              <div className="mt-1 sm:mt-1.5 rounded bg-black/40 border border-white/5 py-0.5 text-center text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300 truncate">
                {hand.hand_name}
                {hand.is_winner ? ' • 👑' : ''}
              </div>
            )}
          </>
        )}

        {/* Floating Mobile Popover Info Card */}
        {showInfoMobile && (
          <div className="sm:hidden absolute bottom-[105%] left-1/2 -translate-x-1/2 mb-1 z-30 w-36 rounded-xl border border-cyan-500/30 bg-[#070b1a]/95 p-2.5 shadow-2xl backdrop-blur-md text-left text-[9px] space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Tiny Popover arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#070b1a] z-30" />
            
            <div className={`font-black text-[10px] truncate ${isMe ? 'text-purple-300' : 'text-cyan-300'}`}>
              {player.display_name ?? player.user_id.slice(0, 8)}
            </div>
            
            <div className="text-slate-400 font-medium">
              Stack: <span className="font-extrabold text-emerald-400">{formatNumber(stack)} pts</span>
            </div>
            
            <div className="text-slate-400 font-medium uppercase tracking-tight">
              Status: <span className={`font-extrabold ${isFolded ? 'text-rose-400' : isAllIn ? 'text-purple-400 animate-pulse' : isThinking ? 'text-cyan-400 animate-pulse' : isReady ? 'text-emerald-400' : 'text-slate-300'}`}>
                {isFolded ? 'FOLDED' : isAllIn ? 'ALL-IN' : isThinking ? 'THINKING' : isReady ? 'READY' : (player.player_status ?? 'WAITING')}
              </span>
            </div>

            {player.is_bot && player.npc_personality && (
              <div className="text-amber-300 font-bold">
                🤖 Personality: {player.npc_personality}
              </div>
            )}

            <div className="text-slate-500 font-bold text-[8px] uppercase">
              Seat: {player.seat_order} {isHost ? '• Host' : ''}
            </div>

            {canKick && onKick && (
              <button
                type="button"
                className="w-full mt-1.5 rounded border border-rose-500/30 bg-rose-500/20 py-1 text-[8px] font-black uppercase tracking-wider text-rose-300 hover:bg-rose-500/30 active:scale-95 transition-all text-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onKick();
                  setShowInfoMobile(false);
                }}
              >
                Kick Player
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function PokerPage({ profile, sessionToken, onSignInClick }: PokerPageProps) {
  const [lobby, setLobby] = useState<PokerTableLobbyItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<PokerLeaderboardEntry[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tableState, setTableState] = useState<PokerTableState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ticking, setTicking] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Table Creation states
  const [createName, setCreateName] = useState('Cyber Enclave');
  const [createMaxPlayers, setCreateMaxPlayers] = useState(6);
  const [createMinBet, setCreateMinBet] = useState(10);
  const [createMaxBet, setCreateMaxBet] = useState(1000);
  const [createPrivate, setCreatePrivate] = useState(false);

  // Gameplay actions
  const [roomCode, setRoomCode] = useState('');
  const [chatText, setChatText] = useState('');
  const [betInput, setBetInput] = useState<number>(10);
  const [raiseToInput, setRaiseToInput] = useState<number>(0);
  const [insufficientPopup, setInsufficientPopup] = useState<{ required: number; available: number } | null>(null);

  const currentPlayer = useMemo(
    () => tableState?.players.find((player) => player.user_id === profile?.uid) ?? null,
    [profile?.uid, tableState?.players],
  );

  const currentHand = useMemo(
    () => tableState?.hands.find((hand) => hand.user_id === profile?.uid) ?? null,
    [profile?.uid, tableState?.hands],
  );

  const countdown = secondsUntil(tableState?.round?.phase_ends_at ?? tableState?.table.countdown_ends_at ?? null);
  
  const seatedPlayers = useMemo(
    () => (tableState?.players ?? []).filter((player) => !player.is_spectator),
    [tableState?.players],
  );
  
  const readyPlayers = useMemo(
    () => seatedPlayers.filter((player) => player.is_ready),
    [seatedPlayers],
  );
  
  const availablePoints = Math.max(
    0,
    currentPlayer?.available_points ?? ((profile?.points ?? 0) - (profile?.locked_points ?? 0)),
  );

  const hostUserId = tableState?.table?.created_by ?? null;
  const isRoomHost = Boolean(profile?.uid && hostUserId && profile.uid === hostUserId);
  
  const phaseLabel = useMemo(() => {
    const phase = tableState?.round?.round_phase;
    if (phase === 'round1') return 'Pre-Flop (R1)';
    if (phase === 'round2') return 'Flop (R2)';
    if (phase === 'round3') return 'Turn (R3)';
    if (phase === 'showdown') return 'Showdown';
    if (phase === 'completed') return 'Completed';
    return 'Lobby Room';
  }, [tableState?.round?.round_phase]);

  const communityCards = useMemo(() => {
    const cards = tableState?.round?.community_cards ?? [];
    const revealed = Math.max(0, Math.min(2, tableState?.round?.community_revealed ?? 0));

    return [0, 1].map((index) => {
      if (index >= cards.length) {
        return 'XX';
      }
      return index < revealed ? cards[index] : 'XX';
    });
  }, [tableState?.round?.community_cards, tableState?.round?.community_revealed]);

  const canTakeRoundAction = Boolean(
    currentPlayer &&
      !currentPlayer.is_spectator &&
      currentPlayer.in_round &&
      tableState?.table?.status === 'playing',
  );

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tableState?.players ?? []).forEach((player) => {
      map.set(player.user_id, player.display_name ?? `User ${player.user_id.slice(0, 6)}`);
    });
    return map;
  }, [tableState?.players]);

  const recentWinnerLogs = useMemo(() => {
    return (tableState?.recent_results ?? [])
      .filter((result) => result.is_winner && result.payout_amount > 0)
      .slice(0, 12)
      .map((result) => ({
        ...result,
        winner_name: playerNameById.get(result.user_id) ?? `User ${result.user_id.slice(0, 6)}`,
      }));
  }, [playerNameById, tableState?.recent_results]);

  const loadLobby = useCallback(async () => {
    const [lobbyResult, boardResult] = await Promise.all([
      tableService.listLobbyTables(sessionToken),
      pointsService.getPokerLeaderboard(),
    ]);

    const stableLobby = [...lobbyResult.data].sort((a, b) => {
      const nameCmp = a.name.localeCompare(b.name);
      if (nameCmp !== 0) return nameCmp;
      const privateCmp = Number(a.is_private) - Number(b.is_private);
      if (privateCmp !== 0) return privateCmp;
      return a.table_id.localeCompare(b.table_id);
    });

    setLobby(stableLobby);
    setLeaderboard(boardResult.data.slice(0, 10));
    if (lobbyResult.error) {
      setError(lobbyResult.error.message);
    }
  }, [sessionToken]);

  const runTick = useCallback(async () => {
    if (!sessionToken) return;
    const tickResult = await pokerService.tickTables(sessionToken);
    if (tickResult.error) {
      setError(`Tick error: ${tickResult.error.message}`);
    }
  }, [sessionToken]);

  const loadTableState = useCallback(async () => {
    if (!selectedTableId || !sessionToken) return;
    const stateResult = await pokerService.getTableState(sessionToken, selectedTableId);

    if (stateResult.error || !stateResult.data) {
      setError(stateResult.error?.message ?? 'Khong the tai trang thai poker.');
      return;
    }
    setTableState(stateResult.data);
  }, [selectedTableId, sessionToken]);

  useEffect(() => {
    if (currentPlayer && !currentPlayer.is_spectator) {
      setBetInput(currentPlayer.current_bet || 0);
      setRaiseToInput(Math.max(currentPlayer.round_bet ?? 0, tableState?.round?.current_bet ?? 0) + (tableState?.table.min_bet ?? 1));
    }
  }, [currentPlayer, tableState?.round?.current_bet, tableState?.table.min_bet]);

  useEffect(() => {
    if (!actionInfo) return;
    const id = window.setTimeout(() => setActionInfo(null), 3500);
    return () => window.clearTimeout(id);
  }, [actionInfo]);

  useEffect(() => {
    void loadLobby();
    const intervalId = window.setInterval(() => void loadLobby(), 10000);
    return () => window.clearInterval(intervalId);
  }, [loadLobby]);

  useEffect(() => {
    if (!selectedTableId || !sessionToken) {
      setTableState(null);
      return;
    }

    void loadTableState();
    const intervalId = window.setInterval(() => void loadTableState(), 2000);

    const channel = pokerService.createTableChannel(selectedTableId, () => {
      void loadTableState();
    });

    const heartBeatId = window.setInterval(() => {
      void tableService.heartbeat(sessionToken, selectedTableId);
    }, 5000);

    const handleBestEffortLeave = () => {
      void tableService.leaveTable(sessionToken, selectedTableId);
    };

    window.addEventListener('pagehide', handleBestEffortLeave);
    window.addEventListener('beforeunload', handleBestEffortLeave);

    return () => {
      window.clearInterval(intervalId);
      window.clearInterval(heartBeatId);
      window.removeEventListener('pagehide', handleBestEffortLeave);
      window.removeEventListener('beforeunload', handleBestEffortLeave);
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadTableState, selectedTableId, sessionToken]);

  useEffect(() => {
    if (!sessionToken) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      setTicking(true);
      runTick().finally(() => setTicking(false));
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [runTick, sessionToken]);

  const handleCreateTable = async () => {
    if (!sessionToken) {
      onSignInClick();
      return;
    }

    setLoading(true);
    const result = await tableService.createTable(sessionToken, {
      name: createName,
      maxPlayers: createMaxPlayers,
      minBet: createMinBet,
      maxBet: createMaxBet,
      isPrivate: createPrivate,
    });
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Khong the tao ban poker.');
      return;
    }

    setSelectedTableId(result.data.table_id);
    setError(null);
    setActionError(null);
    setActionInfo('Tao ban thanh cong.');
    await runTick();
    await Promise.all([loadLobby(), loadTableState()]);
  };

  const handleJoinTable = async (payload: { tableId?: string; roomCode?: string; asSpectator?: boolean }) => {
    if (!sessionToken) {
      onSignInClick();
      return;
    }

    setLoading(true);
    const result = await tableService.joinTable(sessionToken, payload);
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Khong the vao ban poker.');
      return;
    }

    setSelectedTableId(result.data.table_id);
    setError(null);
    setActionError(null);
    setActionInfo('Da vao ban.');
    await runTick();
    await loadTableState();
  };

  const handleLeaveTable = async () => {
    if (!sessionToken || !selectedTableId) return;

    await tableService.leaveTable(sessionToken, selectedTableId);
    setSelectedTableId(null);
    setTableState(null);
    await loadLobby();
  };

  const handleSendChat = async () => {
    if (!sessionToken || !selectedTableId || !chatText.trim()) return;

    const result = await chatService.sendPokerMessage(sessionToken, selectedTableId, chatText);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setChatText('');
    await loadTableState();
  };

  const handleSetBet = async () => {
    if (!sessionToken || !selectedTableId) return;

    const result = await tableService.setBet(sessionToken, selectedTableId, Math.max(1, Math.trunc(betInput)));
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    setActionError(null);
    setActionInfo('Da cap nhat muc cuoc.');
    await loadTableState();
  };

  const handleSetReady = async (ready: boolean) => {
    if (!sessionToken || !selectedTableId) return;

    if (ready) {
      const required = currentPlayer?.current_bet ?? 0;
      if (required > availablePoints) {
        setInsufficientPopup({ required, available: availablePoints });
        return;
      }
    }

    const result = await tableService.setReady(sessionToken, selectedTableId, ready);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    setActionError(null);
    setActionInfo(ready ? 'Da ready.' : 'Da unready.');
    await runTick();
    await loadTableState();
  };

  const handleTakeAction = async (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in') => {
    if (!sessionToken || !selectedTableId) return;

    if (!currentPlayer) {
      setActionError('Khong tim thay vi tri nguoi choi trong ban.');
      return;
    }

    if (currentPlayer.is_spectator) {
      setActionError('Spectator khong the action.');
      return;
    }

    if (!currentPlayer.in_round) {
      setActionError('Ban khong nam trong active round. Hay doi van moi va READY.');
      return;
    }

    if (action === 'raise') {
      const need = Math.max(0, raiseToInput - (currentPlayer?.round_bet ?? 0));
      if (need > availablePoints) {
        setInsufficientPopup({ required: need, available: availablePoints });
        return;
      }
    }

    if (action === 'call') {
      const toCall = Math.max(0, (tableState?.round?.current_bet ?? 0) - (currentPlayer?.round_bet ?? 0));
      if (toCall <= 0) {
        setActionError('Khong co so tien nao can Call. Ban co the Check.');
        return;
      }
      if (toCall > availablePoints) {
        setInsufficientPopup({ required: toCall, available: availablePoints });
        return;
      }
    }

    if (action === 'check') {
      const toCall = Math.max(0, (tableState?.round?.current_bet ?? 0) - (currentPlayer?.round_bet ?? 0));
      if (toCall > 0) {
        setActionError(`Khong the Check, ban can Call them ${formatNumber(toCall)}.`);
        return;
      }
    }

    if (action === 'all-in' && availablePoints <= 0) {
      setInsufficientPopup({ required: 1, available: availablePoints });
      return;
    }

    try {
      const result = await tableService.takeAction(
        sessionToken,
        selectedTableId,
        action,
        action === 'raise' ? Math.trunc(raiseToInput) : undefined,
      );
      if (result.error) {
        setActionError(result.error.message);
        return;
      }

      setActionError(null);
      setActionInfo(`Action thanh cong: ${action.toUpperCase()}.`);
      await runTick();
    } finally {
      await loadTableState();
    }
  };

  const handleKickPlayer = async (targetUserId: string, targetName?: string) => {
    if (!sessionToken || !selectedTableId || !isRoomHost) return;

    const result = await tableService.hostKickPlayer(sessionToken, selectedTableId, targetUserId);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }

    setActionError(null);
    setActionInfo(`Da kick ${targetName ?? targetUserId.slice(0, 8)} khoi ban.`);
    await runTick();
    await loadTableState();
  };

  const copyToClipboard = () => {
    if (!tableState?.table.room_code) return;
    navigator.clipboard.writeText(tableState.table.room_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header sign-in alert */}
      {!sessionToken && (
        <motion.div
          className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-display font-black text-white text-lg tracking-wide uppercase">Virtual Poker Room Access</h3>
            <p className="text-sm text-slate-400">Authenticating is required to create rooms, view tables, and join online games.</p>
          </div>
          <button
            onClick={onSignInClick}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-black text-xs uppercase tracking-widest text-slate-950 transition-all hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-95"
          >
            <LogIn size={14} />
            Authorize Interface
          </button>
        </motion.div>
      )}

      {/* Global Error Banner */}
      {error && (
        <motion.div
          className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-rose-400">⚡</span>
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {actionError && (
        <motion.div
          className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-400">!</span>
            <span>{actionError}</span>
          </div>
        </motion.div>
      )}

      {actionInfo && (
        <motion.div
          className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">i</span>
            <span>{actionInfo}</span>
          </div>
        </motion.div>
      )}

      {/* Insufficient Points Modal */}
      <AnimatePresence>
        {insufficientPopup && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
            <motion.div
              className="w-full max-w-sm rounded-[2.5rem] border border-rose-500/30 bg-[#0f0407] p-8 shadow-[0_0_50px_rgba(244,63,94,0.25)] text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
                <DollarSign size={28} />
              </div>
              <h3 className="mb-2 font-display text-xl font-black uppercase tracking-tight text-rose-300">Insufficient Chips</h3>
              <p className="mb-6 text-sm text-slate-400 leading-relaxed">
                You need <span className="font-black text-white">{formatNumber(insufficientPopup.required)}</span> points, but you only have{' '}
                <span className="font-black text-rose-300">{formatNumber(insufficientPopup.available)}</span>. Add points or lower your cược!
              </p>
              <button
                className="choice-button w-full text-xs font-black uppercase py-3 border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
                onClick={() => setInsufficientPopup(null)}
              >
                Return to Panel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!selectedTableId ? (
        // ----------------- LOBBY STATE -----------------
        <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
          {/* LOBBY LIST */}
          <section className="panel p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Operational Hub</span>
                <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white mt-1">Table Lobby</h2>
              </div>
              <button
                onClick={() => void loadLobby()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Scan Lobby
              </button>
            </div>

            {/* Room Code Direct Join */}
            <div className="grid gap-3 rounded-2xl border border-white/5 bg-[#070b19]/60 p-4 sm:grid-cols-[1fr_auto]">
              <input
                className="form-input text-sm text-center tracking-widest font-black uppercase"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="ENTER SECURE ROOM CODE"
              />
              <button
                onClick={() => void handleJoinTable({ roomCode, asSpectator: false })}
                className="choice-button text-xs py-3 px-6 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                disabled={!roomCode.trim() || loading}
              >
                Establish Link
              </button>
            </div>

            {/* List of active tables */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {lobby.map((table) => (
                <motion.div
                  key={table.table_id}
                  className="rounded-2xl border border-white/5 bg-slate-900/20 p-4 hover:border-cyan-500/25 hover:bg-slate-900/40 transition-all duration-300"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base tracking-tight">{table.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {table.table_id.slice(0, 10)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                      table.status === 'playing'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse'
                        : table.status === 'showdown'
                          ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                          : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                    }`}>
                      {table.status}
                    </span>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-4 text-[11px] font-medium text-slate-400 border-t border-white/5 pt-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={12} className="text-cyan-400" />
                      {table.player_count}/{table.max_players} Seated
                    </span>
                    <span>Ready: <strong className="text-emerald-400 font-bold">{table.ready_count}</strong></span>
                    <span>Stakes: <strong className="text-slate-200 font-bold">{formatNumber(table.min_bet)} - {formatNumber(table.max_bet)}</strong></span>
                    {table.room_code && (
                      <span className="rounded bg-[#121c38] px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-300">CODE: {table.room_code}</span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      className="choice-button flex-1 text-xs py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/25 active:scale-95"
                      onClick={() => void handleJoinTable({ tableId: table.table_id })}
                    >
                      Join Game
                    </button>
                    <button
                      className="choice-button flex-1 text-xs py-2 bg-slate-800/40 hover:bg-slate-800/80 text-slate-400 hover:text-white border-slate-700/50 active:scale-95"
                      onClick={() => void handleJoinTable({ tableId: table.table_id, asSpectator: true })}
                    >
                      <span className="inline-flex items-center gap-1.5 justify-center">
                        <Eye size={12} />
                        Spectate
                      </span>
                    </button>
                  </div>
                </motion.div>
              ))}

              {lobby.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
                  <p className="text-sm">No active virtual tables found.</p>
                  <p className="text-xs text-slate-600 mt-1">Initialize a table using the terminal deck on the right.</p>
                </div>
              )}
            </div>
          </section>

          {/* CREATE TABLE & LEADERBOARD */}
          <div className="space-y-8">
            {/* Create Table Form */}
            <section className="panel p-6 sm:p-8 space-y-5">
              <h3 className="font-display text-lg font-black uppercase tracking-tight text-white border-b border-white/5 pb-3">Deploy Table</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Table Name</label>
                  <input
                    className="form-input w-full text-sm"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Enter table name..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Max Seated</label>
                    <input
                      className="form-input w-full text-sm font-bold text-center"
                      type="number"
                      value={createMaxPlayers}
                      onChange={(event) => setCreateMaxPlayers(Number(event.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Min Bet</label>
                    <input
                      className="form-input w-full text-sm font-bold text-center"
                      type="number"
                      value={createMinBet}
                      onChange={(event) => setCreateMinBet(Number(event.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Max Bet</label>
                    <input
                      className="form-input w-full text-sm font-bold text-center"
                      type="number"
                      value={createMaxBet}
                      onChange={(event) => setCreateMaxBet(Number(event.target.value))}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createPrivate}
                    onChange={(event) => setCreatePrivate(event.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0 focus:ring-offset-0"
                  />
                  Secure Room Code (Private lobby)
                </label>

                <button
                  className="choice-button w-full text-xs font-black uppercase py-3.5 bg-gradient-to-r from-cyan-600 to-purple-600 text-white border-none hover:shadow-[0_0_24px_rgba(34,211,238,0.3)] hover:scale-[1.01] transition-all"
                  onClick={() => void handleCreateTable()}
                  disabled={loading}
                >
                  <span className="inline-flex items-center gap-2">
                    <PlusCircle size={14} />
                    Deploy Virtual Arena
                  </span>
                </button>
              </div>
            </section>

            {/* Poker Leaderboard */}
            <section className="panel p-6 sm:p-8 space-y-4">
              <h3 className="font-display text-lg font-black uppercase tracking-tight text-white border-b border-white/5 pb-3">Lobby Leaderboard</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {leaderboard.map((row, index) => {
                  const isTop3 = index < 3;
                  const medalColor = index === 0 ? 'text-amber-400 border-amber-400/30' : index === 1 ? 'text-slate-300 border-slate-300/30' : 'text-amber-600 border-amber-600/30';
                  
                  return (
                    <div
                      key={row.user_id}
                      className={`leader-row flex items-center justify-between text-xs p-3 rounded-xl bg-slate-900/10 border ${
                        isTop3 ? `${medalColor} bg-slate-900/40` : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isTop3 ? (
                          <div className={`rank-badge flex h-8 w-8 items-center justify-center rounded-lg border bg-black/40 font-black ${medalColor}`}>
                            <Award size={14} />
                          </div>
                        ) : (
                          <span className="rank-badge w-8 text-center text-slate-500 font-bold text-xs">{index + 1}</span>
                        )}
                        <div>
                          <div className="font-bold text-white tracking-tight">{row.display_name}</div>
                          <div className="text-[9px] text-slate-500 font-mono">@{row.account_name}</div>
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="font-black text-emerald-400 text-sm">{formatNumber(row.net_points)}</div>
                        <div className="text-[9px] text-slate-500 font-medium">Win rate: {row.win_rate}%</div>
                      </div>
                    </div>
                  );
                })}

                {leaderboard.length === 0 && (
                  <div className="text-center text-xs text-slate-500 py-4">Telemetry loading...</div>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        // ----------------- GAME PLAYING STATE -----------------
        <section className="panel p-6 sm:p-8 space-y-8">
          {/* Header Panel info */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">TABLE OPERATIONS</span>
                {tableState?.table.room_code && (
                  <button
                    onClick={copyToClipboard}
                    className="group inline-flex items-center gap-1 rounded bg-[#0e1628] border border-cyan-500/20 px-2 py-0.5 text-[9px] font-mono text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition-all"
                  >
                    CODE: {tableState.table.room_code}
                    {copiedCode ? <Check size={8} /> : <Copy size={8} className="text-cyan-400/60 group-hover:text-cyan-400" />}
                  </button>
                )}
              </div>
              <h2 className="font-display text-3xl font-black uppercase tracking-tight text-white mt-1">
                {tableState?.table.name}
              </h2>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-yellow-300">
                <Crown size={10} />
                Host: {hostUserId === profile?.uid ? 'You' : (tableState?.players.find((p) => p.user_id === hostUserId)?.display_name ?? 'Unknown')}
              </div>
            </div>
            
            {/* Live game metrics info */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-white/5 bg-slate-900/35 px-4 py-2 text-right">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Current Phase</div>
                <div className="text-sm font-black text-cyan-400">{phaseLabel}</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900/35 px-4 py-2 text-right">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Pot Size</div>
                <div className="text-sm font-black text-amber-300">{formatNumber(tableState?.round?.pot_amount ?? 0)}</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900/35 px-4 py-2 text-right">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Countdown</div>
                <div className="text-sm font-black text-rose-400 animate-pulse">{countdown}s</div>
              </div>
              
              <div className="flex gap-2 ml-2">
                <button
                  className="choice-button text-xs py-2 bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 border-slate-700/50"
                  onClick={() => void loadTableState()}
                >
                  Sync
                </button>
                <button
                  className="choice-button text-xs py-2 bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 border-rose-500/30 active:scale-95 transition-all"
                  onClick={() => void handleLeaveTable()}
                >
                  Leave
                </button>
              </div>
            </div>
          </div>

          {/* VIRTUAL POKER TABLE CONTAINER - Fully Responsive Oval/Capsule Felt */}
          <div className="flex items-center justify-center px-4 py-8 sm:px-16 sm:py-12 w-full overflow-visible">
            <div className="relative w-full aspect-[0.72/1] sm:aspect-[2.2/1] rounded-[48px] sm:rounded-[140px] border-[6px] sm:border-[12px] border-[#131924] bg-radial-[circle_at_center,_#0b233a_0%,_#030712_90%] shadow-[inset_0_0_40px_rgba(6,182,212,0.2),_0_20px_40px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-visible">
              {/* Felt inner line ring */}
              <div className="absolute inset-4 sm:inset-8 rounded-[40px] sm:rounded-[112px] border border-cyan-500/10 pointer-events-none" />

              {/* CENTER felt deck area - Positioned absolutely in the dead center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center space-y-2 sm:space-y-3 z-10 bg-black/55 backdrop-blur-md px-3 py-2.5 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl border border-white/5 shadow-2xl w-[150px] xs:w-[180px] sm:w-[260px] max-w-full">
                <div className="space-y-0.5">
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/80">TOTAL POT</span>
                  <div className="text-sm xs:text-base sm:text-3xl font-black text-amber-300 flex items-center justify-center gap-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                    👑 {formatNumber(tableState?.round?.pot_amount ?? 0)}
                  </div>
                </div>

                {/* Community Cards Display */}
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500">Community Cards</div>
                  <div className="flex gap-1 sm:gap-2 justify-center overflow-x-auto max-w-full pb-0.5">
                    {communityCards.length > 0 ? (
                      communityCards.map((card, index) => (
                        <motion.div
                          key={`community-oval-${index}-${card}`}
                          initial={{ scale: 0.8, rotateY: 90, opacity: 0 }}
                          animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                          transition={{ duration: 0.35, delay: index * 0.1 }}
                        >
                          <PlayingCard card={card} size="responsive" />
                        </motion.div>
                      ))
                    ) : (
                      <span className="text-[7px] sm:text-[9px] text-slate-500 italic block py-1 sm:py-2">Dealing cards...</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                  <div className="text-[6px] sm:text-[9px] font-bold text-slate-400 bg-slate-950/40 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-white/5 truncate max-w-full">
                    Phase: <span className="text-cyan-400 font-bold uppercase">{tableState?.round?.round_phase ?? 'Waiting'}</span>
                  </div>

                  {countdown > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 sm:px-3.5 sm:py-1 text-[8px] sm:text-xs font-black text-rose-400 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                      <span className="text-[8px] sm:text-[10px]">⏳</span>
                      <span>ACTION: {countdown}s</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SEATS - Arranged absolute around the responsive rim */}
              {seatedPlayers.map((player) => (
                <div
                  key={`seat-${player.user_id}`}
                  className={`absolute transition-all duration-300 ${getSeatClass(player.seat_order)}`}
                >
                  <SeatCard
                    player={player}
                    hand={(tableState?.hands ?? []).find((hand) => hand.user_id === player.user_id) ?? null}
                    isMe={player.user_id === profile?.uid}
                    isHost={player.user_id === hostUserId}
                    canKick={Boolean(isRoomHost && player.user_id !== profile?.uid)}
                    onKick={() => void handleKickPlayer(player.user_id, player.display_name)}
                  />
                </div>
              ))}

              {/* Dedicated "YOUR HOLE CARDS" Display at the Bottom-Center of the felt table */}
              {currentPlayer && !currentPlayer.is_spectator && (
                <motion.div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[20%] sm:translate-y-[35%] z-20 flex flex-col items-center gap-1 sm:gap-2 rounded-2xl sm:rounded-3xl border border-purple-500 bg-[#070a16] p-2.5 sm:p-4 shadow-[0_0_15px_rgba(168,85,247,0.4)] sm:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                  initial={{ y: 30, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                >
                  <div className="absolute -top-2.5 sm:-top-3.5 rounded-full bg-purple-600 border border-purple-400 px-2.5 py-0.5 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-white shadow-[0_0_10px_rgba(168,85,247,0.6)] whitespace-nowrap">
                    Your Hole Cards
                  </div>
                  
                  <div className="flex gap-1 sm:gap-2 pt-1">
                    {((currentHand?.cards) ?? ['XX', 'XX', 'XX']).slice(0, 3).map((card, index) => (
                      <motion.div
                        key={`my-felt-card-${index}-${card}`}
                        initial={{ rotateY: 90, scale: 0.8 }}
                        animate={{ rotateY: 0, scale: 1 }}
                        transition={{ duration: 0.35, delay: index * 0.1 }}
                      >
                        <PlayingCard card={card} size="responsive" />
                      </motion.div>
                    ))}
                  </div>

                  {currentHand?.hand_name && (
                    <div className="rounded bg-black/60 border border-purple-500/20 px-2 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-amber-300 shadow-inner max-w-[100px] sm:max-w-none truncate text-center">
                      👑 {currentHand.hand_name}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* ACTION DECK PANEL */}
          <div className="grid gap-6 xl:grid-cols-[1fr_320px] border-t border-white/5 pt-6">
            
            {/* Player Control Station */}
            <div className="rounded-2xl border border-white/5 bg-[#070b19]/40 p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-300">Player Control Station</span>
                <span className="text-[10px] font-black text-slate-400 uppercase">
                  Available Chips: <strong className="text-emerald-400 font-bold">{formatNumber(availablePoints)} pts</strong>
                </span>
              </div>

              {currentPlayer && !currentPlayer.is_spectator ? (
                <div className="space-y-4">
                  {/* Visual Hand display inside action deck for supreme accessibility */}
                  <div className="rounded-xl border border-purple-500/20 bg-purple-950/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Your Private Hand</span>
                      <h4 className="text-base font-black text-white">{currentHand?.hand_name ?? 'Waiting for Deal...'}</h4>
                      <p className="text-[10px] text-slate-400">These cards are private. Play strategically!</p>
                    </div>

                    <div className="flex gap-2">
                      {((currentHand?.cards) ?? ['XX', 'XX', 'XX']).slice(0, 3).map((card, index) => (
                        <PlayingCard key={`control-card-${index}-${card}`} card={card} size="lg" />
                      ))}
                    </div>
                  </div>

                  {/* Lobby/Waiting Ready action */}
                  <div className="flex flex-wrap items-center gap-3 bg-[#0a0d1d] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Buy-in stake</span>
                      <input
                        type="number"
                        className="form-input w-28 text-center text-xs font-bold"
                        value={betInput}
                        onChange={(event) => setBetInput(Number(event.target.value))}
                        disabled={tableState?.table.status !== 'waiting'}
                      />
                      {tableState?.table.status === 'waiting' && (
                        <button
                          className="choice-button text-[10px] py-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-300 font-bold"
                          onClick={() => void handleSetBet()}
                        >
                          Lock Stake
                        </button>
                      )}
                    </div>

                    <button
                      className={`choice-button text-[10px] py-1.5 px-5 font-black uppercase transition-all ${
                        currentPlayer?.is_ready
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      }`}
                      onClick={() => void handleSetReady(!(currentPlayer?.is_ready ?? false))}
                    >
                      {currentPlayer?.is_ready ? 'Cancel Ready' : 'Set Ready'}
                    </button>

                    <div className="ml-auto text-[10px] text-slate-400 font-semibold uppercase">
                      Combo: <span className="text-amber-300 font-black">{currentHand?.hand_name ?? 'Waiting for Deal'}</span>
                    </div>
                  </div>

                  {/* Turn Playing Actions */}
                  {tableState?.table?.status === 'playing' && (
                    <div className="space-y-4 pt-2">
                      {/* Betting action controls */}
                      <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                        <button
                          className="choice-button text-xs py-3 rounded-xl border border-slate-700/50 bg-gradient-to-b from-slate-800/40 to-slate-900/60 text-slate-300 hover:text-rose-400 hover:border-rose-500/30 transition-all font-black uppercase active:scale-95 disabled:opacity-30"
                          onClick={() => void handleTakeAction('fold')}
                          disabled={!canTakeRoundAction}
                        >
                          Fold
                        </button>
                        <button
                          className="choice-button text-xs py-3 rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-600/20 to-indigo-800/10 text-indigo-300 hover:text-white hover:border-indigo-400/50 transition-all font-black uppercase active:scale-95 disabled:opacity-30"
                          onClick={() => void handleTakeAction('check')}
                          disabled={!canTakeRoundAction}
                        >
                          Check
                        </button>
                        <button
                          className="choice-button text-xs py-3 rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/20 to-cyan-700/10 text-cyan-300 hover:text-white hover:border-cyan-400/50 transition-all font-black uppercase active:scale-95 disabled:opacity-30"
                          onClick={() => void handleTakeAction('call')}
                          disabled={!canTakeRoundAction}
                        >
                          Call
                        </button>
                        <button
                          className="choice-button text-xs py-3 rounded-xl border border-purple-500/40 bg-gradient-to-b from-purple-600/20 to-fuchsia-600/20 text-purple-300 hover:text-white hover:border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.2)] animate-pulse transition-all font-black uppercase active:scale-95 disabled:opacity-30"
                          onClick={() => void handleTakeAction('all-in')}
                          disabled={!canTakeRoundAction}
                        >
                          All-in
                        </button>
                      </div>

                      {/* Raising sub-panel */}
                      <div className="bg-[#0b1022] p-4 rounded-xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-400">Raise Cược Amount</span>
                          <span className="font-black text-amber-300">{formatNumber(raiseToInput)} pts</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                            min={Math.max(currentPlayer?.round_bet ?? 0, tableState?.round?.current_bet ?? 0) + (tableState?.table.min_bet ?? 1)}
                            max={availablePoints + (currentPlayer?.round_bet ?? 0)}
                            value={raiseToInput}
                            onChange={(event) => setRaiseToInput(Number(event.target.value))}
                            disabled={!canTakeRoundAction}
                          />
                          <input
                            type="number"
                            className="form-input w-28 text-center text-xs font-bold"
                            value={raiseToInput}
                            onChange={(event) => setRaiseToInput(Number(event.target.value))}
                            disabled={!canTakeRoundAction}
                          />
                        </div>

                        {/* Quick Bet Shortcuts */}
                        <div className="flex gap-2">
                          {[50, 100, 500, 1000].map((val) => (
                            <button
                              key={`shortcut-${val}`}
                              className="choice-button flex-1 text-[10px] py-1 bg-slate-900/40 border-white/5 text-slate-400 hover:text-white hover:border-slate-600"
                              onClick={() => {
                                const min = Math.max(currentPlayer?.round_bet ?? 0, tableState?.round?.current_bet ?? 0) + (tableState?.table.min_bet ?? 1);
                                setRaiseToInput(Math.min(availablePoints + (currentPlayer?.round_bet ?? 0), min + val));
                              }}
                              disabled={!canTakeRoundAction}
                            >
                              +{val}
                            </button>
                          ))}
                        </div>

                        <button
                          className="choice-button w-full text-xs py-3 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 font-black uppercase tracking-wider"
                          onClick={() => void handleTakeAction('raise')}
                          disabled={!canTakeRoundAction}
                        >
                          Confirm Raise
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-slate-500 text-sm">
                  📢 You are currently spectating. Seated spots are full or table is in play.
                </div>
              )}

              {/* Recent Results panel inside play page */}
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300 border-b border-white/5 pb-1">
                  History Log
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {recentWinnerLogs.map((result, idx) => (
                    <div key={`${result.round_id}-${result.user_id}-${idx}`} className="flex justify-between text-[11px] text-slate-300 py-0.5 border-b border-white/[0.02]">
                      <span className="font-semibold text-slate-300 truncate pr-2">
                        {result.winner_name} • {result.hand_name ?? 'Winner'}
                      </span>
                      <span className="font-bold text-emerald-400 whitespace-nowrap">
                        +{formatNumber(result.payout_amount)} pts
                      </span>
                    </div>
                  ))}

                  {recentWinnerLogs.length === 0 && (
                    <div className="text-center text-[10px] text-slate-600 py-2">No winner payouts recorded yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Module */}
            <div className="rounded-2xl border border-white/5 bg-[#070b19]/40 p-5 flex flex-col justify-between h-[450px]">
              <div className="space-y-4 flex flex-col h-full justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-300 border-b border-white/5 pb-3">
                  <span className="text-cyan-400">💬</span>
                  Table Feed
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 my-2">
                  {(tableState?.chat ?? []).slice(-30).map((message) => {
                    const isMsgAdmin = message.role === 'admin';
                    return (
                      <div key={message.message_id} className="rounded-xl bg-black/35 p-3 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-black ${isMsgAdmin ? 'text-rose-400' : 'text-cyan-300'}`}>
                            {message.display_name}
                          </span>
                          {message.vip_level > 0 && (
                            <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[8px] font-black text-amber-400">VIP {message.vip_level}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed break-words">{message.text}</p>
                      </div>
                    );
                  })}

                  {(tableState?.chat ?? []).length === 0 && (
                    <div className="text-center text-xs text-slate-600 py-10">Chat is silent. Speak up!</div>
                  )}
                </div>
              </div>

              {/* Chat Send Area */}
              <div className="flex gap-2 pt-3 border-t border-white/5">
                <input
                  className="form-input flex-1 text-xs"
                  value={chatText}
                  onChange={(event) => setChatText(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void handleSendChat()}
                  placeholder="Broadcast message..."
                />
                <button
                  className="choice-button px-4 py-2 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-none transition-all active:scale-95 flex items-center justify-center shrink-0"
                  onClick={() => void handleSendChat()}
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
