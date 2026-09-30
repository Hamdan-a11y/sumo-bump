import { useEffect, useRef, useState } from 'react';
import './App.css';
import { sounds } from './audio';
import { FighterCustomizer } from './components/FighterCustomizer';
import { Joystick } from './components/Joystick';
import { Lobby } from './components/Lobby';
import { Overlay } from './components/Overlay';
import { Scoreboard } from './components/Scoreboard';
import { CANVAS_SIZE, THEME } from './config';
import { EffectsManager } from './game/effects';
import { createInitialState, updateGameState } from './game/engine';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboard } from './hooks/useKeyboard';
import { NetworkTransport } from './network/transport';
import { drawArena, drawPlayer, drawPowerUp } from './renderer';

function App() {
  const canvasRef = useRef(null);
  const keys = useKeyboard();
  const effectsRef = useRef(new EffectsManager());

  const [playMode, setPlayMode] = useState('LOBBY');
  const [waitingRoomId, setWaitingRoomId] = useState(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const customFaceUrl = useRef(null);

  const transportRef = useRef(null);
  const guestInputRef = useRef({ x: 0, y: 0, dash: false });
  const latestSnapshotRef = useRef(null);

  // Joysticks & Dash Triggers
  const joystickP1 = useRef({ x: 0, y: 0 });
  const joystickP2 = useRef({ x: 0, y: 0 });
  const dashTriggerP1 = useRef(false);
  const dashTriggerP2 = useRef(false);

  // Heartbeat & Sudden Death Vignette
  const vignetteRef = useRef(null);
  const heartbeatTimer = useRef(0);
  const vignettePulse = useRef(0);

  const gameStateRef = useRef(createInitialState());
  const [uiState, setUiState] = useState(() => ({
    score: { p1: 0, p2: 0 },
    gameState: 'COUNTDOWN',
    countdown: 3,
    winner: null,
  }));

  const syncUi = (s) => {
    setUiState({
      score: { ...s.score },
      gameState: s.gameState,
      countdown: s.countdown,
      winner: s.winner,
    });
  };

  const applyFaceImage = (player, dataUrl) => {
    if (!dataUrl) return;
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      player.faceImage = img;
    };
  };

  const handleSaveFace = (dataUrl) => {
    customFaceUrl.current = dataUrl;
    applyFaceImage(gameStateRef.current.p1, dataUrl);
  };

  const startLocalPlay = () => {
    sounds.init();
    gameStateRef.current = createInitialState();
    if (customFaceUrl.current) {
      applyFaceImage(gameStateRef.current.p1, customFaceUrl.current);
    }
    syncUi(gameStateRef.current);
    setPlayMode('LOCAL');
  };

  // Countdown timer with sound pings
  useEffect(() => {
    if (playMode === 'LOBBY' || playMode === 'ONLINE_GUEST') return;
    if (uiState.gameState !== 'COUNTDOWN') return;

    if (uiState.countdown > 0) {
      sounds.playBeep(false);
      const timer = setTimeout(() => {
        gameStateRef.current.countdown -= 1;
        syncUi(gameStateRef.current);
      }, 750);
      return () => clearTimeout(timer);
    } else {
      sounds.playBeep(true);
      const timer = setTimeout(() => {
        gameStateRef.current.gameState = 'PLAYING';
        syncUi(gameStateRef.current);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [playMode, uiState.gameState, uiState.countdown]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      joinOnlineRoom(roomParam);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
  }, []);

  const createOnlineRoom = () => {
    sounds.init();
    const transport = new NetworkTransport();
    transportRef.current = transport;

    const roomId = transport.createRoom({
      onConnected: () => {
        setWaitingRoomId(null);
        setPlayMode('ONLINE_HOST');
        gameStateRef.current = createInitialState();
        if (customFaceUrl.current) {
          applyFaceImage(gameStateRef.current.p1, customFaceUrl.current);
          transport.send({ type: 'PLAYER_FACE', face: customFaceUrl.current, forPlayer: 'p1' });
        }
        syncUi(gameStateRef.current);
      },
      onData: (data) => {
        if (data.type === 'GUEST_INPUT') {
          guestInputRef.current = data.input;
        } else if (data.type === 'PLAYER_FACE') {
          applyFaceImage(gameStateRef.current.p2, data.face);
        }
      },
      onDisconnected: () => {
        alert('Opponent disconnected!');
        setPlayMode('LOBBY');
      },
    });

    setWaitingRoomId(roomId);
  };

  const joinOnlineRoom = (roomId) => {
    sounds.init();
    const transport = new NetworkTransport();
    transportRef.current = transport;

    transport.joinRoom(roomId, {
      onConnected: () => {
        setPlayMode('ONLINE_GUEST');
        if (customFaceUrl.current) {
          transport.send({ type: 'PLAYER_FACE', face: customFaceUrl.current, forPlayer: 'p2' });
        }
      },
      onData: (data) => {
        if (data.type === 'SNAPSHOT') {
          latestSnapshotRef.current = data.state;
          syncUi(data.state);
        } else if (data.type === 'FX_BUMP') {
          sounds.playBump();
          effectsRef.current.triggerShake(data.isSuper ? 15 : 8);
          effectsRef.current.spawnSparks(data.x, data.y, data.isSuper ? '#f59e0b' : '#ffffff');
        } else if (data.type === 'FX_DASH') {
          sounds.playDash();
        } else if (data.type === 'PLAYER_FACE') {
          applyFaceImage(gameStateRef.current.p1, data.face);
        }
      },
      onDisconnected: () => {
        alert('Host disconnected!');
        setPlayMode('LOBBY');
      },
    });
  };

  const handleRematch = () => {
    if (playMode === 'ONLINE_GUEST') return;
    gameStateRef.current = createInitialState();
    if (customFaceUrl.current) {
      applyFaceImage(gameStateRef.current.p1, customFaceUrl.current);
    }
    syncUi(gameStateRef.current);
  };

  // 60fps Game Loop
  useGameLoop((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const effects = effectsRef.current;
    effects.update(dt);

    ctx.save();
    if (effects.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * effects.shakeIntensity;
      const sy = (Math.random() - 0.5) * effects.shakeIntensity;
      ctx.translate(sx, sy);
    }

    // 1. HOST / LOCAL SIMULATION
    if (playMode === 'LOCAL' || playMode === 'ONLINE_HOST' || playMode === 'LOBBY') {
      const state = gameStateRef.current;

      if (playMode !== 'LOBBY') {
        const p1Input = {
          x: (keys.current['KeyD'] ? 1 : 0) - (keys.current['KeyA'] ? 1 : 0) || joystickP1.current.x,
          y: (keys.current['KeyS'] ? 1 : 0) - (keys.current['KeyW'] ? 1 : 0) || joystickP1.current.y,
          dash: keys.current['Space'] || dashTriggerP1.current,
        };
        dashTriggerP1.current = false;

        const p2Input = playMode === 'ONLINE_HOST'
          ? guestInputRef.current
          : {
              x: (keys.current['ArrowRight'] ? 1 : 0) - (keys.current['ArrowLeft'] ? 1 : 0) || joystickP2.current.x,
              y: (keys.current['ArrowDown'] ? 1 : 0) - (keys.current['ArrowUp'] ? 1 : 0) || joystickP2.current.y,
              dash: keys.current['Enter'] || keys.current['ShiftRight'] || dashTriggerP2.current,
            };
        dashTriggerP2.current = false;

        const prevScore = `${state.score.p1}-${state.score.p2}-${state.gameState}`;
        
        updateGameState(state, { p1: p1Input, p2: p2Input }, dt, (event) => {
          if (event.type === 'BUMP') {
            sounds.playBump();
            effects.triggerShake(event.isSuper ? 16 : 8);
            effects.spawnSparks(event.x, event.y, event.isSuper ? '#f59e0b' : '#ffffff');
            if (playMode === 'ONLINE_HOST') {
              transportRef.current?.send({ type: 'FX_BUMP', x: event.x, y: event.y, isSuper: event.isSuper });
            }
          } else if (event.type === 'DASH') {
            sounds.playDash();
            effects.spawnSparks(event.x, event.y, '#00e5ff');
            if (playMode === 'ONLINE_HOST') {
              transportRef.current?.send({ type: 'FX_DASH' });
            }
          } else if (event.type === 'POWERUP') {
            sounds.playPowerUp();
            effects.spawnSparks(event.x, event.y, '#f59e0b');
          } else if (event.type === 'RING_OUT') {
            sounds.playRingOut();
            effects.triggerShake(14);
          }
        });

        if (`${state.score.p1}-${state.score.p2}-${state.gameState}` !== prevScore) {
          syncUi(state);
        }

        if (playMode === 'ONLINE_HOST') {
          transportRef.current?.send({
            type: 'SNAPSHOT',
            state: {
              p1: { ...state.p1, faceImage: undefined },
              p2: { ...state.p2, faceImage: undefined },
              arenaRadius: state.arenaRadius,
              powerUp: state.powerUp,
              score: state.score,
              gameState: state.gameState,
              countdown: state.countdown,
              winner: state.winner,
            },
          });
        }
      }

      ctx.clearRect(-20, -20, CANVAS_SIZE + 40, CANVAS_SIZE + 40);
      drawArena(ctx, THEME.arena, state.arenaRadius);
      drawPowerUp(ctx, state.powerUp);
      drawPlayer(ctx, state.p1);
      drawPlayer(ctx, state.p2);
      effects.draw(ctx);
    }

    // 2. GUEST (RENDER & INTERPOLATE)
    if (playMode === 'ONLINE_GUEST') {
      const myInput = {
        x: (keys.current['ArrowRight'] || keys.current['KeyD'] ? 1 : 0) - (keys.current['ArrowLeft'] || keys.current['KeyA'] ? 1 : 0) || joystickP2.current.x,
        y: (keys.current['ArrowDown'] || keys.current['KeyS'] ? 1 : 0) - (keys.current['ArrowUp'] || keys.current['KeyW'] ? 1 : 0) || joystickP2.current.y,
        dash: keys.current['Space'] || keys.current['Enter'] || dashTriggerP2.current,
      };
      dashTriggerP2.current = false;

      transportRef.current?.send({
        type: 'GUEST_INPUT',
        input: myInput,
      });

      const snap = latestSnapshotRef.current;
      if (snap) {
        const local = gameStateRef.current;
        local.p1.x += (snap.p1.x - local.p1.x) * 0.4;
        local.p1.y += (snap.p1.y - local.p1.y) * 0.4;
        local.p1.radius = snap.p1.radius;
        local.p1.squash = snap.p1.squash;
        local.p2.x += (snap.p2.x - local.p2.x) * 0.4;
        local.p2.y += (snap.p2.y - local.p2.y) * 0.4;
        local.p2.radius = snap.p2.radius;
        local.p2.squash = snap.p2.squash;

        ctx.clearRect(-20, -20, CANVAS_SIZE + 40, CANVAS_SIZE + 40);
        drawArena(ctx, THEME.arena, snap.arenaRadius);
        drawPowerUp(ctx, snap.powerUp);
        drawPlayer(ctx, local.p1);
        drawPlayer(ctx, local.p2);
        effects.draw(ctx);
      }
    }

    // 3. SUDDEN DEATH HEARTBEAT & PULSING VIGNETTE
    const currentRadius = playMode === 'ONLINE_GUEST'
      ? (latestSnapshotRef.current?.arenaRadius || THEME.arena.radius)
      : gameStateRef.current.arenaRadius;

    const isPlaying = playMode !== 'LOBBY' && (
      playMode === 'ONLINE_GUEST'
        ? latestSnapshotRef.current?.gameState === 'PLAYING'
        : gameStateRef.current.gameState === 'PLAYING'
    );

    if (isPlaying && currentRadius < 265) {
      // Danger scales 0 -> 1 as radius shrinks from 265 down to 170
      const dangerRatio = Math.max(0, Math.min(1, (265 - currentRadius) / (265 - 170)));

      // Tempo increases: 1.1s (slow suspense) down to 0.32s (rapid panic)
      const bpmInterval = 1.1 - dangerRatio * 0.78;
      heartbeatTimer.current -= dt;

      if (heartbeatTimer.current <= 0) {
        heartbeatTimer.current = bpmInterval;
        sounds.playHeartbeat(0.4 + dangerRatio * 0.6);
        vignettePulse.current = 1.0; // Visual heart pulse flash!
      }

      // Decay pulse
      vignettePulse.current = Math.max(0, vignettePulse.current - dt * 3.5);

      // Smoothly update vignette opacity without React re-render
      if (vignetteRef.current) {
        const opacity = dangerRatio * 0.25 + vignettePulse.current * dangerRatio * 0.75;
        vignetteRef.current.style.opacity = opacity.toFixed(3);
      }
    } else {
      if (vignetteRef.current && vignetteRef.current.style.opacity !== '0') {
        vignetteRef.current.style.opacity = '0';
      }
    }

    ctx.restore();
  });

  return (
    <div className="game-container">
      {/* Sudden Death Pulsing Red Vignette */}
      <div ref={vignetteRef} className="danger-vignette" />

      <canvas ref={canvasRef} id="game-canvas" />

      {playMode === 'LOBBY' && (
        <Lobby
          onCreateRoom={createOnlineRoom}
          onJoinRoom={joinOnlineRoom}
          onPlayLocal={startLocalPlay}
          onOpenCustomizer={() => setShowCustomizer(true)}
          waitingRoomId={waitingRoomId}
        />
      )}

      {showCustomizer && (
        <FighterCustomizer
          onSave={handleSaveFace}
          onClose={() => setShowCustomizer(false)}
        />
      )}

      {playMode !== 'LOBBY' && (
        <>
          <Scoreboard score={uiState.score} theme={THEME} />
          <Overlay
            gameState={uiState.gameState}
            countdown={uiState.countdown}
            winner={uiState.winner}
            theme={THEME}
            onRematch={handleRematch}
          />

          {playMode === 'ONLINE_GUEST' ? (
            <>
              <Joystick side="right" onMove={(v) => (joystickP2.current = v)} />
              <button 
                className="mobile-dash-btn dash-left"
                onPointerDown={() => (dashTriggerP2.current = true)}
              >
                DASH!
              </button>
            </>
          ) : (
            <>
              <Joystick side="left" onMove={(v) => (joystickP1.current = v)} />
              <button 
                className="mobile-dash-btn dash-left-btn"
                onPointerDown={() => (dashTriggerP1.current = true)}
              >
                DASH!
              </button>
              {playMode === 'LOCAL' && (
                <>
                  <Joystick side="right" onMove={(v) => (joystickP2.current = v)} />
                  <button 
                    className="mobile-dash-btn dash-right-btn"
                    onPointerDown={() => (dashTriggerP2.current = true)}
                  >
                    DASH!
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
