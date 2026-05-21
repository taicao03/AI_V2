import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ArrowRight, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Check, 
  Layout, 
  Grid3X3,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl'; // sm: 33%, md: 50%, lg: 66%, xl: 100%

export interface CustomizableWidget {
  id: string;
  title: string;
  description?: string;
  defaultSize: WidgetSize;
  defaultVisible?: boolean;
  render: () => React.ReactNode;
}

export interface WidgetLayoutState {
  id: string;
  size: WidgetSize;
  visible: boolean;
  order: number;
}

export interface PresetLayout {
  name: string;
  description: string;
  settings: Record<string, { size: WidgetSize; visible: boolean; order: number }>;
}

interface CustomizableLayoutContainerProps {
  layoutKey: string;
  widgets: CustomizableWidget[];
  presets?: Record<string, PresetLayout>;
  title?: string;
}

export function CustomizableLayoutContainer({
  layoutKey,
  widgets,
  presets,
  title = "Tùy Chỉnh Giao Diện"
}: CustomizableLayoutContainerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [layoutStates, setLayoutStates] = useState<WidgetLayoutState[]>([]);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Initialize layout states
  useEffect(() => {
    const saved = localStorage.getItem(layoutKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetLayoutState[];
        // Verify we have all widgets, if some new widgets were added, merge them
        const savedIds = parsed.map(w => w.id);
        const missingWidgets = widgets.filter(w => !savedIds.includes(w.id));
        
        if (missingWidgets.length > 0) {
          const merged = [
            ...parsed,
            ...missingWidgets.map((w, idx) => ({
              id: w.id,
              size: w.defaultSize,
              visible: w.defaultVisible !== false,
              order: parsed.length + idx,
            }))
          ];
          setLayoutStates(merged);
          localStorage.setItem(layoutKey, JSON.stringify(merged));
        } else {
          // Sort by order to ensure consistency
          setLayoutStates(parsed.sort((a, b) => a.order - b.order));
        }
        return;
      } catch (e) {
        console.error("Failed to parse layout from localStorage, using default", e);
      }
    }

    // Default layout state
    const defaults = widgets.map((w, idx) => ({
      id: w.id,
      size: w.defaultSize,
      visible: w.defaultVisible !== false,
      order: idx
    }));
    setLayoutStates(defaults);
    localStorage.setItem(layoutKey, JSON.stringify(defaults));
  }, [layoutKey, widgets]);

  // Save changes to localStorage
  const saveLayout = (nextStates: WidgetLayoutState[]) => {
    setLayoutStates(nextStates);
    localStorage.setItem(layoutKey, JSON.stringify(nextStates));
  };

  // Reorder: Shift position in the array
  const moveWidget = (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= layoutStates.length) return;

    const updated = [...layoutStates];
    // Swap order property
    const tempOrder = updated[index].order;
    updated[index].order = updated[targetIndex].order;
    updated[targetIndex].order = tempOrder;

    // Swap indices in the array to let motion.div handle layout animation
    const tempItem = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = tempItem;

    saveLayout(updated);
  };

  // Change individual widget size
  const cycleSize = (id: string, currentSize: WidgetSize) => {
    const sizes: WidgetSize[] = ['sm', 'md', 'lg', 'xl'];
    const nextIdx = (sizes.indexOf(currentSize) + 1) % sizes.length;
    const nextSize = sizes[nextIdx];

    const updated = layoutStates.map(w => 
      w.id === id ? { ...w, size: nextSize } : w
    );
    saveLayout(updated);
  };

  const setSpecificSize = (id: string, size: WidgetSize) => {
    const updated = layoutStates.map(w => 
      w.id === id ? { ...w, size } : w
    );
    saveLayout(updated);
  };

  // Toggle widget visibility
  const toggleVisibility = (id: string) => {
    const updated = layoutStates.map(w => 
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    saveLayout(updated);
  };

  // Reset to default
  const handleReset = () => {
    if (window.confirm("Bạn có muốn đặt lại bố cục giao diện mặc định?")) {
      const defaults = widgets.map((w, idx) => ({
        id: w.id,
        size: w.defaultSize,
        visible: w.defaultVisible !== false,
        order: idx
      }));
      saveLayout(defaults);
    }
  };

  // Apply layout preset
  const applyPreset = (presetName: string) => {
    if (!presets || !presets[presetName]) return;
    const preset = presets[presetName];
    
    const updated = layoutStates.map(item => {
      const settings = preset.settings[item.id];
      if (settings) {
        return {
          ...item,
          size: settings.size,
          visible: settings.visible,
          order: settings.order
        };
      }
      return item;
    });

    // Re-sort according to preset order
    updated.sort((a, b) => a.order - b.order);
    // Reset order indices to standard sequence
    updated.forEach((item, index) => {
      item.order = index;
    });

    saveLayout(updated);
  };

  // Grid sizing mapper classes
  const getSizeClass = (size: WidgetSize) => {
    switch (size) {
      case 'sm': return 'col-span-12 lg:col-span-4'; // 1/3
      case 'md': return 'col-span-12 lg:col-span-6'; // 1/2
      case 'lg': return 'col-span-12 lg:col-span-8'; // 2/3
      case 'xl': return 'col-span-12';              // 100%
      default: return 'col-span-12 lg:col-span-6';
    }
  };

  // Map widgets list to their current state dictionary for easy access
  const widgetDict = new Map(widgets.map(w => [w.id, w]));

  return (
    <div className="space-y-4">
      {/* --- Top Controller Strip --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-slate-900/80 to-purple-950/20 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/30">
            <Layout size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-white flex items-center gap-2">
              {title}
              {isEditing && (
                <span className="animate-pulse rounded-md bg-fuchsia-500/20 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-300 border border-fuchsia-500/30">
                  EDIT MODE
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isEditing ? "Thay đổi vị trí, kích thước hoặc ẩn bớt các mô-đun bàn chơi" : "Tự do sắp xếp bố cục theo ý thích của bạn"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Preset selector if defined */}
          {presets && Object.keys(presets).length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/40 px-2 py-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 pl-1">Bản mẫu:</span>
              <select 
                className="bg-transparent text-xs text-slate-300 font-bold border-none outline-none focus:ring-0 cursor-pointer"
                onChange={(e) => e.target.value && applyPreset(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled className="bg-slate-900">Chọn mẫu...</option>
                {Object.entries(presets).map(([key, p]) => (
                  <option key={key} value={key} className="bg-slate-900 text-slate-300">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold uppercase transition-all duration-200 ${
              showConfigPanel 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'bg-slate-950/40 text-slate-400 border border-white/10 hover:border-slate-500'
            }`}
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            type="button"
          >
            <Sliders size={12} />
            Ẩn/Hiện Widget
          </button>

          <button
            className="flex items-center gap-1 rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white hover:border-white/20 transition-all duration-200"
            onClick={handleReset}
            type="button"
          >
            <RotateCcw size={12} />
            Đặt Lại
          </button>

          <button
            className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              isEditing 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border border-emerald-400/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
                : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400'
            }`}
            onClick={() => setIsEditing(!isEditing)}
            type="button"
          >
            {isEditing ? (
              <>
                <Check size={12} />
                Hoàn Tất
              </>
            ) : (
              <>
                <Settings size={12} className="animate-spin-slow" />
                Sửa Bố Cục
              </>
            )}
          </button>
        </div>
      </div>

      {/* --- Hide/Show Selection Drawer Panel --- */}
      <AnimatePresence>
        {showConfigPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#070b16]/90 p-4 backdrop-blur-md grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {layoutStates.map((widgetState) => {
                const widget = widgetDict.get(widgetState.id);
                if (!widget) return null;
                return (
                  <button
                    key={widgetState.id}
                    onClick={() => toggleVisibility(widgetState.id)}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 ${
                      widgetState.visible
                        ? 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300'
                        : 'border-white/5 bg-black/10 text-slate-500 hover:border-white/10'
                    }`}
                    type="button"
                  >
                    <div className="flex-shrink-0">
                      {widgetState.visible ? (
                        <CheckSquare size={16} className="text-cyan-400" />
                      ) : (
                        <Square size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold">{widget.title}</div>
                      {widget.description && (
                        <div className="truncate text-[10px] text-slate-400">{widget.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Main Dashboard Widgets Grid Container --- */}
      <motion.div 
        layout="position"
        className="grid grid-cols-12 gap-4"
      >
        {layoutStates
          .filter(state => state.visible)
          .map((state, index) => {
            const widget = widgetDict.get(state.id);
            if (!widget) return null;

            return (
              <motion.div
                key={state.id}
                layoutId={state.id}
                layout
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className={`${getSizeClass(state.size)} transition-all duration-300 relative`}
              >
                {/* Visual outline in Edit Mode */}
                {isEditing && (
                  <div className="absolute -inset-1 z-40 rounded-3xl border-2 border-dashed border-cyan-400/40 bg-cyan-950/5 pointer-events-none" />
                )}

                {/* Grid Item Card Wrapper */}
                <div className={`h-full flex flex-col group ${isEditing ? 'opacity-90 select-none' : ''}`}>
                  {/* Edit Handles Strip overlay inside card when editing */}
                  {isEditing && (
                    <div className="flex items-center justify-between rounded-t-2xl border-t border-x border-cyan-500/30 bg-[#0c1428] px-3 py-1.5 text-xs text-slate-300 z-40">
                      <span className="font-extrabold text-[10px] text-cyan-400 tracking-wider uppercase">
                        {widget.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* Size controllers */}
                        <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/5">
                          {(['sm', 'md', 'lg', 'xl'] as WidgetSize[]).map((sz) => (
                            <button
                              key={sz}
                              onClick={() => setSpecificSize(state.id, sz)}
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase transition-all duration-150 ${
                                state.size === sz 
                                  ? 'bg-cyan-500/20 text-cyan-300' 
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                              title={`Đặt độ rộng: ${sz === 'sm' ? '33%' : sz === 'md' ? '50%' : sz === 'lg' ? '66%' : '100%'}`}
                              type="button"
                            >
                              {sz}
                            </button>
                          ))}
                        </div>

                        {/* Reorder Arrows */}
                        <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/5">
                          <button
                            disabled={index === 0}
                            onClick={() => moveWidget(index, 'prev')}
                            className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-150"
                            title="Di chuyển lên/trái"
                            type="button"
                          >
                            <ArrowLeft size={10} />
                          </button>
                          <button
                            disabled={index === layoutStates.filter(s => s.visible).length - 1}
                            onClick={() => moveWidget(index, 'next')}
                            className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-150"
                            title="Di chuyển xuống/phải"
                            type="button"
                          >
                            <ArrowRight size={10} />
                          </button>
                        </div>

                        {/* Hide button */}
                        <button
                          onClick={() => toggleVisibility(state.id)}
                          className="rounded-lg bg-red-950/40 hover:bg-red-900/60 p-1 border border-red-500/20 text-rose-400 hover:text-rose-300 transition-all duration-150"
                          title="Ẩn widget này"
                          type="button"
                        >
                          <EyeOff size={10} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* The Actual Widget Component content */}
                  <div className={`flex-1 ${isEditing ? 'rounded-b-2xl border-b border-x border-cyan-500/30 overflow-hidden' : ''}`}>
                    {widget.render()}
                  </div>
                </div>
              </motion.div>
            );
          })}
      </motion.div>
    </div>
  );
}
