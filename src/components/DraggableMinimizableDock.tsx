import React, { useState, useRef } from 'react';
import { GripHorizontal, Minimize2, Maximize2, MoveUpRight, RotateCcw } from 'lucide-react';
import { soundEngine } from '../utils/soundAndSpeech';

interface DraggableMinimizableDockProps {
  title: string;
  minimizedLabel?: string;
  defaultMinimized?: boolean;
  children: React.ReactNode;
  maxWidthClass?: string;
}

/**
 * Painel Flutuante Arrastável e Minimizável.
 * Permite que a criança ou o professor arraste o painel para qualquer ponto da tela
 * (tirando de cima dos potes de tinta 3D ou das peças na bancada) ou o minimize em uma pílula compacta.
 */
export const DraggableMinimizableDock: React.FC<DraggableMinimizableDockProps> = ({
  title,
  minimizedLabel = 'Abrir Painel de Controles',
  defaultMinimized = false,
  children,
  maxWidthClass = 'max-w-3xl',
}) => {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignora cliques em botões dentro da barra de título
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    const clampedX = Math.max(-window.innerWidth * 0.42, Math.min(window.innerWidth * 0.42, dragStartRef.current.origX + dx));
    const clampedY = Math.max(-window.innerHeight * 0.72, Math.min(40, dragStartRef.current.origY + dy));
    setOffset({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const moveAsidePreset = () => {
    soundEngine.playTap();
    // Alterna entre canto superior direito, canto inferior direito ou posição original
    if (Math.abs(offset.y) < 50) {
      setOffset({ x: Math.min(260, window.innerWidth * 0.22), y: -window.innerHeight * 0.52 });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  if (isMinimized) {
    return (
      <div
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
        className="pointer-events-none fixed bottom-3 right-4 z-20 flex justify-end"
      >
        <button
          type="button"
          onClick={() => {
            soundEngine.playTap();
            setIsMinimized(false);
          }}
          className="pointer-events-auto hc-surface min-h-[46px] px-4 py-2 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border-2 border-amber-400 text-amber-300 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-2xl transition-transform hover:scale-105"
          title="Restaurar painel de controles"
        >
          <Maximize2 className="w-4 h-4 text-amber-400" />
          <span>{minimizedLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      className="pointer-events-none fixed bottom-2 inset-x-0 z-20 px-3 md:px-6 flex justify-center"
    >
      <div
        className={`pointer-events-auto hc-surface ${maxWidthClass} w-full rounded-3xl bg-slate-900/95 border-2 border-slate-700 shadow-2xl overflow-hidden transition-shadow ${
          isDragging ? 'border-amber-400 ring-2 ring-amber-400/50' : ''
        }`}
      >
        {/* Barra Superior de Arrastar e Minimizar */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="cursor-grab active:cursor-grabbing bg-slate-950/90 border-b border-slate-800 px-3.5 py-1.5 flex items-center justify-between gap-2 select-none"
          title="Segure e arraste esta barra para mover o painel para onde quiser!"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <GripHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{title}</span>
            <span className="hidden sm:inline text-[11px] font-normal text-slate-400">
              (Arraste aqui para mover)
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(offset.x !== 0 || offset.y !== 0) && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setOffset({ x: 0, y: 0 });
                }}
                className="min-h-[28px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 flex items-center gap-1"
                title="Voltar painel para o centro"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden md:inline">Centralizar</span>
              </button>
            )}

            <button
              type="button"
              onClick={moveAsidePreset}
              className="min-h-[28px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-sky-300 flex items-center gap-1"
              title="Mover painel para fora das tintas/peças"
            >
              <MoveUpRight className="w-3.5 h-3.5 text-sky-400" />
              <span>Mover p/ Canto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setIsMinimized(true);
              }}
              className="min-h-[28px] px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold flex items-center gap-1"
              title="Minimizar este painel para ver toda a mesa 3D"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Minimizar</span>
            </button>
          </div>
        </div>

        {/* Conteúdo do Painel */}
        <div className="p-2.5 md:p-3">{children}</div>
      </div>
    </div>
  );
};
