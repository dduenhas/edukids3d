import React, { useState } from 'react';
import {
  X,
  Star,
  Clock,
  HelpCircle,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Award,
  Compass,
  Sparkles,
} from 'lucide-react';
import { EduGamesProgress, GameId } from '../utils/storage';
import { soundEngine } from '../utils/soundAndSpeech';

interface TeacherPanelModalProps {
  progress: EduGamesProgress;
  onResetProgress: () => void;
  onClose: () => void;
}

const GAME_DETAILS: Array<{
  id: GameId;
  name: string;
  pilar: string;
  bnccCode: string;
  camposExperiencia: string;
  pedagogicalGoal: string;
  mediationQuestion: string;
  unpluggedActivity: string;
}> = [
  {
    id: 'monte-amiguinho',
    name: '1. Monte o Amiguinho 3D',
    pilar: 'Decomposição',
    bnccCode: 'EI03CO01 / EI03CO02',
    camposExperiencia: 'O eu, o outro e o nós · Corpo, gestos e movimentos',
    pedagogicalGoal:
      'Compreender que um sistema ou personagem complexo pode ser dividido em subsistemas menores (cabeça, tronco, braços, pernas, antena) e acoplado etapa por etapa no espaço tridimensional.',
    mediationQuestion:
      '"Qual peça precisamos colocar primeiro para sustentar o corpo do Robô Bit? O que acontece se esquecermos um dos braços?"',
    unpluggedActivity:
      'Desenhar um boneco gigante em papel kraft no chão e recortar em 6 partes para a turma montar em equipe.',
  },
  {
    id: 'quebra-cabeca',
    name: '2. Quebra-Cabeça de Blocos 3D',
    pilar: 'Decomposição + Abstração',
    bnccCode: 'EI03CO01',
    camposExperiencia: 'Traços, sons, cores e formas · Espaços, tempos, quantidades',
    pedagogicalGoal:
      'Observar a figura completa durante 3 segundos (planejamento e retenção de atributos essenciais), abstrair detalhes locais e reconstruir o todo girando e encaixando blocos 3D.',
    mediationQuestion:
      '"Onde estava a ponta do foguete antes das peças espalharem? Como sabemos se este bloco está de cabeça para baixo?"',
    unpluggedActivity:
      'Quebra-cabeça físico com caixas de papelão pintadas pelas crianças.',
  },
  {
    id: 'pinte-regras',
    name: '3. Pinte o Brinquedo 3D (Receita de Cores)',
    pilar: 'Algoritmos (Sequência Ordenada)',
    bnccCode: 'EI03CO02 / EI03CO03',
    camposExperiencia: 'Escuta, fala, pensamento e imaginação · Traços, sons, cores e formas',
    pedagogicalGoal:
      'Executar e verbalizar algoritmos como sequências finitas e ordenadas de instruções ("1º pegue a tinta X, 2º pinte a parte Y"), compreendendo que a ordem dos passos altera o resultado.',
    mediationQuestion:
      '"Qual passo da receita vem agora? Na Fase 3, você pode inventar a sua própria receita para o colega seguir!"',
    unpluggedActivity:
      'Brincadeira do "Mestre Pintor": uma criança dita 3 passos de cores em voz alta e o colega colore no papel.',
  },
  {
    id: 'tangram-bit',
    name: '4. Tangram de Madeira 3D',
    pilar: 'Abstração + Geometria Espacial',
    bnccCode: 'EI03CO01',
    camposExperiencia: 'Espaços, tempos, quantidades, relações e transformações',
    pedagogicalGoal:
      'Focar na representação geométrica essencial (triângulos, quadrados, paralelogramos) ignorando detalhes superficiais para compor silhuetas complexas (casa, gato, foguete) com rotação espacial de 45°.',
    mediationQuestion:
      '"Quais peças parecem com as orelhas do gatinho? Se girarmos este triângulo, ele cabe no telhado?"',
    unpluggedActivity:
      'Tangram em EVA ou madeira sobre mesas de luz para explorar sombras e silhuetas.',
  },
  {
    id: 'continue-sequencia',
    name: '5. Trilho de Padrões e Bichinhos 3D',
    pilar: 'Reconhecimento de Padrões',
    bnccCode: 'EI03CO01',
    camposExperiencia: 'Traços, sons, cores e formas · Escuta, fala, pensamento e imaginação',
    pedagogicalGoal:
      'Identificar regularidades visuais (cor, forma, escala grande/pequena) e auditivas (vozes de animais) em séries lógicas (ABAB, AABAAB, ABCABC) para prever o próximo elemento.',
    mediationQuestion:
      '"Vamos cantar o padrão juntos? Vermelho, Azul, Vermelho, Azul... qual vem agora?"',
    unpluggedActivity:
      'Fila de padrões corporais na roda (bater palma, bater pé, bater palma, bater pé).',
  },
  {
    id: 'programe-bit',
    name: '6. Bônus: Tabuleiro do Robô Bit 3D',
    pilar: 'Algoritmos Explícitos & Depuração',
    bnccCode: 'EI03CO02 / EI03CO03',
    camposExperiencia: 'Espaços, tempos, quantidades, relações e transformações',
    pedagogicalGoal:
      'Planejar uma fila de comandos direcionais (⬆️➡️⬇️⬅️) antes da execução, testar o trajeto no tabuleiro 3D e realizar a depuração (debugging) substituindo o comando que colidiu com um cristal.',
    mediationQuestion:
      '"Em qual passo o Robô Bit encontrou o cristal vermelho? Para qual lado ele deveria virar naquele passo?"',
    unpluggedActivity:
      'Tabuleiro humano no pátio com fita crepe: uma criança é o "Programador" (cartões de setas) e outra é o "Robô".',
  },
];

/**
 * Página Completa de Fundamentação Pedagógica (BNCC Computação) & Painel Formativo do Professor.
 * Abre ao tocar no Chapéu de Formatura na barra superior.
 */
export const TeacherPanelModal: React.FC<TeacherPanelModalProps> = ({
  progress,
  onResetProgress,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'fundamentacao' | 'matriz' | 'relatorio'>(
    'fundamentacao'
  );
  const [confirmReset, setConfirmReset] = useState(false);

  const totalStars = (Object.values(progress.stars) as [boolean, boolean, boolean][]).reduce(
    (acc, arr) => acc + arr.filter(Boolean).length,
    0
  );

  const totalAttempts = (
    Object.values(progress.metrics) as EduGamesProgress['metrics'][GameId][]
  ).reduce((acc, m) => acc + m.attempts, 0);

  const totalSeconds = (
    Object.values(progress.metrics) as EduGamesProgress['metrics'][GameId][]
  ).reduce((acc, m) => acc + m.totalSecondsPlayed, 0);

  let mostPlayedName = 'Nenhum ainda';
  let maxScore = 0;
  GAME_DETAILS.forEach((g) => {
    const m = progress.metrics[g.id];
    const score = m.attempts * 10 + m.totalSecondsPlayed;
    if (score > maxScore) {
      maxScore = score;
      mostPlayedName = g.name;
    }
  });

  const formatTime = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}min ${rem}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 md:p-6 overflow-y-auto">
      <div className="hc-surface w-full max-w-5xl rounded-3xl bg-slate-900 border-2 border-slate-700 p-5 md:p-8 shadow-2xl my-6 max-h-[92vh] overflow-y-auto text-white">
        {/* Cabeçalho Principal */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
                <BookOpen className="w-4 h-4" />
                <span>Resolução CNE/CEB nº 2/2022 · Complemento à BNCC de Computação</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white font-display">
                Fundamentação Pedagógica e Avaliação Formativa
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onClose();
            }}
            className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2"
            aria-label="Fechar Fundamentação Pedagógica"
          >
            <X className="w-5 h-5" />
            <span>Fechar</span>
          </button>
        </div>

        {/* Abas de Navegação da Página Pedagógica */}
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              setActiveTab('fundamentacao');
            }}
            className={`flex-1 min-h-[44px] px-4 rounded-xl font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'fundamentacao'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>1. Fundamentação Teórica & BNCC</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              setActiveTab('matriz');
            }}
            className={`flex-1 min-h-[44px] px-4 rounded-xl font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'matriz'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Matriz Didática dos 6 Jogos 3D</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              setActiveTab('relatorio');
            }}
            className={`flex-1 min-h-[44px] px-4 rounded-xl font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'relatorio'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>3. Relatório Formativo da Criança</span>
          </button>
        </div>

        {/* ABA 1: FUNDAMENTAÇÃO TEÓRICA & BNCC COMPUTAÇÃO */}
        {activeTab === 'fundamentacao' && (
          <div className="space-y-6">
            {/* Diretrizes Gerais e Referencial Teórico */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <div className="text-xs font-extrabold text-amber-400 uppercase">
                  Construcionismo & Manipulação 3D
                </div>
                <h3 className="text-base font-bold text-white">
                  Seymour Papert & Objetos para Pensar
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Na Educação Infantil (4 a 5 anos), o pensamento abstrato emerge da manipulação
                  sensório-motora. Os ambientes 3D táteis funcionam como <em>"objetos-para-pensar-com"</em>,
                  permitindo que a criança gire, conecte peças robóticas e observe causa e efeito imediatos.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <div className="text-xs font-extrabold text-sky-400 uppercase">
                  Os 4 Pilares de Jeannette Wing
                </div>
                <h3 className="text-base font-bold text-white">
                  Eixo Pensamento Computacional
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O aplicativo desenvolve de forma lúdica e integrada a <strong>Decomposição</strong>{' '}
                  (dividir um problema em partes), o <strong>Reconhecimento de Padrões</strong>{' '}
                  (regularidades visuais e sonoras), a <strong>Abstração</strong> (silhuetas e formas)
                  e os <strong>Algoritmos</strong> (sequências passo a passo).
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <div className="text-xs font-extrabold text-emerald-400 uppercase">
                  Mediação & Andaime (Vygotsky)
                </div>
                <h3 className="text-base font-bold text-white">
                  Erro Não-Punitivo e Zona de Desenvolvimento
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nenhuma tentativa gera punição ou perda de pontos. O Robô Bit atua como mediador
                  pedagógico por síntese de voz e pistas visuais progressivas (glow, setas 3D e
                  depuração assistida), promovendo a autonomia de crianças pré-leitoras.
                </p>
              </div>
            </div>

            {/* Habilidades Oficiais da BNCC Computação na Educação Infantil */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Premissas e Objetivos de Aprendizagem — BNCC Computação (Educação Infantil)</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Resolução CNE/CEB nº 2, de 17 de fevereiro de 2022
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
                  <div className="text-xs font-mono font-extrabold text-sky-400 mb-1">
                    Habilidade EI03CO01
                  </div>
                  <div className="text-sm font-bold text-white mb-1.5">
                    Reconhecimento de Padrões e Conjuntos
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Reconhecer e identificar padrões em objetos, sequências de figuras, sons e
                    movimentos, construindo conjuntos a partir de diferentes critérios (cor, forma,
                    tamanho e função).
                  </p>
                  <div className="mt-2 text-[11px] text-amber-300 font-semibold">
                    Jogos: Monte o Amiguinho, Quebra-Cabeça, Tangram e Sequências.
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
                  <div className="text-xs font-mono font-extrabold text-amber-400 mb-1">
                    Habilidade EI03CO02
                  </div>
                  <div className="text-sm font-bold text-white mb-1.5">
                    Expressão Ordenada de Etapas (Algoritmos)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Expressar as etapas para a realização de uma tarefa de forma clara e ordenada,
                    compreendendo a importância da sequência lógica ("Primeiro... Depois... Por fim").
                  </p>
                  <div className="mt-2 text-[11px] text-amber-300 font-semibold">
                    Jogos: Pinte Seguindo as Regras 3D e Tabuleiro do Robô Bit 3D.
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
                  <div className="text-xs font-mono font-extrabold text-emerald-400 mb-1">
                    Habilidade EI03CO03
                  </div>
                  <div className="text-sm font-bold text-white mb-1.5">
                    Execução, Teste e Depuração de Algoritmos
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Experimentar a execução de algoritmos simples (brincando de robô ou comandando
                    personagens), testando hipóteses e corrigindo passos quando o caminho encontra
                    obstáculos.
                  </p>
                  <div className="mt-2 text-[11px] text-amber-300 font-semibold">
                    Jogos: Programe o Robô Bit 3D e Receita Livre de Pintura.
                  </div>
                </div>
              </div>
            </div>

            {/* Integração com os Direitos de Aprendizagem da BNCC */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5">
              <h3 className="text-sm font-extrabold text-sky-400 uppercase tracking-wider mb-3">
                Articulação com os 6 Direitos de Aprendizagem e Desenvolvimento (BNCC)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-center">
                {[
                  { title: 'Brincar', desc: 'Oficina 3D lúdica com brinquedos vivos' },
                  { title: 'Explorar', desc: 'Fase 3 aberta de criação livre em cada jogo' },
                  { title: 'Expressar', desc: 'Verbalização da receita de cores e comandos' },
                  { title: 'Participar', desc: 'Protagonismo na escolha de estratégias' },
                  { title: 'Conviver', desc: 'Atividades desplugadas em roda com colegas' },
                  { title: 'Conhecer-se', desc: 'Criação do próprio avatar mascote 3D' },
                ].map((d) => (
                  <div
                    key={d.title}
                    className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between"
                  >
                    <div className="font-extrabold text-sm text-amber-400 mb-1">{d.title}</div>
                    <div className="text-[11px] text-slate-300 leading-snug">{d.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: MATRIZ DIDÁTICA DOS 6 JOGOS & SUGESTÕES DE MEDIAÇÃO */}
        {activeTab === 'matriz' && (
          <div className="space-y-4">
            <p className="text-xs md:text-sm text-slate-300">
              Guia prático para o(a) professor(a) articular cada jogo 3D com perguntas mediadoras e
              vivências desconectadas (computação desplugada) em sala de aula:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GAME_DETAILS.map((game) => (
                <div
                  key={game.id}
                  className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-base text-white">{game.name}</span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {game.bnccCode}
                      </span>
                    </div>
                    <div className="text-xs text-sky-400 font-semibold">
                      Pilar: {game.pilar} · {game.camposExperiencia}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>Objetivo Cognitivo:</strong> {game.pedagogicalGoal}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="text-amber-200">
                      <strong>💬 Pergunta Mediadora:</strong> {game.mediationQuestion}
                    </div>
                    <div className="text-emerald-300">
                      <strong>🧩 Extensão Desplugada:</strong> {game.unpluggedActivity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 3: RELATÓRIO FORMATIVO DA CRIANÇA / TURMA */}
        {activeTab === 'relatorio' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                <div className="text-xs text-slate-400 mb-1">Estrelas Conquistadas</div>
                <div className="flex items-center gap-2 text-2xl font-bold text-amber-400 tabular-nums">
                  <Star className="w-6 h-6 fill-amber-400" />
                  <span>{totalStars} / 18</span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                <div className="text-xs text-slate-400 mb-1">Total de Interações</div>
                <div className="flex items-center gap-2 text-2xl font-bold text-sky-400 tabular-nums">
                  <CheckCircle2 className="w-6 h-6" />
                  <span>{totalAttempts}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                <div className="text-xs text-slate-400 mb-1">Tempo Total de Exploração</div>
                <div className="flex items-center gap-2 text-2xl font-bold text-emerald-400 tabular-nums">
                  <Clock className="w-6 h-6" />
                  <span>{formatTime(totalSeconds)}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                <div className="text-xs text-slate-400 mb-1">Atividade Mais Explorada</div>
                <div className="text-sm font-bold text-white truncate mt-1">
                  {mostPlayedName}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              {GAME_DETAILS.map((game) => {
                const stars = progress.stars[game.id];
                const m = progress.metrics[game.id];
                const avgTime =
                  m.completions > 0
                    ? Math.round(m.totalSecondsPlayed / m.completions)
                    : m.totalSecondsPlayed;

                return (
                  <div
                    key={game.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">{game.name}</span>
                        <span className="text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs font-semibold text-sky-400">
                          Pilar: {game.pilar}
                        </span>
                        <span className="text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs font-mono text-slate-400">{game.bnccCode}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {game.pedagogicalGoal}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-5 shrink-0 text-xs text-slate-300 tabular-nums">
                      <div className="flex items-center gap-1" title="Estrelas nas Fases 1, 2 e 3">
                        {[0, 1, 2].map((idx) => (
                          <Star
                            key={idx}
                            className={`w-4 h-4 ${
                              stars[idx] ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <div>
                        <span className="text-slate-500">Tentativas:</span>{' '}
                        <strong className="text-white">{m.attempts}</strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-slate-500">Dicas:</span>{' '}
                        <strong className="text-white">{m.hintsUsed}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Tempo médio:</span>{' '}
                        <strong className="text-white">{formatTime(avgTime)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                100% privado e offline: os dados ficam salvos apenas no navegador deste dispositivo (
                <code className="text-slate-300">localStorage</code>).
              </div>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/60 text-rose-200 text-xs font-semibold flex items-center gap-2 whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Zerar Progresso da Turma/Criança</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap"
                  >
                    Confirmar Limpeza
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
