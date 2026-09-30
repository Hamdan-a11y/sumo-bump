import { useEffect, useRef, useState } from 'react';
import './App.css';
import { sounds } from './audio';
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

  const transportRef = useRef(null);
  const guestInputRef = useRef({ x: 0, y: 0 });
  const latestSnapshotRef = useRef(null);

  const joystickP1 = useRef({ x: 0, y: 0 });
  const joystickP2 = useRef({ x: 0, y: 0 });

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

  const startLocalPlay = () => {
    sounds.init();
    gameStateRef.current = createInitialState();
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
        syncUi(gameStateRef.current);
      },
      onData: (data) => {
        if (data.type === 'GUEST_INPUT') {
          guestInputRef.current = data.input;
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
      },
      onData: (data) => {
        if (data.type === 'SNAPSHOT') {
          latestSnapshotRef.current = data.state;
          syncUi(data.state);
        } else if (data.type === 'FX_BUMP') {
          sounds.playBump();
          effectsRef.current.triggerShake(7);
          effectsRef.current.spawnSparks(data.x, data.y);
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
    syncUi(gameStateRef.current);
  };

  // 60fps Game Loop
  useGameLoop((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const effects = effectsRef.current;
    effects.update(dt);

    // Apply Screen Shake offset
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
        };

        const p2Input = playMode === 'ONLINE_HOST'
          ? guestInputRef.current
          : {
              x: (keys.current['ArrowRight'] ? 1 : 0) - (keys.current['ArrowLeft'] ? 1 : 0) || joystickP2.current.x,
              y: (keys.current['ArrowDown'] ? 1 : 0) - (keys.current['ArrowUp'] ? 1 : 0) || joystickP2.current.y,
            };

        const prevScore = `${state.score.p1}-${state.score.p2}-${state.gameState}`;
        
        // Physics update with event callbacks (bumps, powerups, ringouts)
        updateGameState(state, { p1: p1Input, p2: p2Input }, dt, (event) => {
          if (event.type === 'BUMP') {
            sounds.playBump();
            effects.triggerShake(8);
            effects.spawnSparks(event.x, event.y);
            if (playMode === 'ONLINE_HOST') {
              transportRef.current?.send({ type: 'FX_BUMP', x: event.x, y: event.y });
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
              p1: state.p1,
              p2: state.p2,
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
      };

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
        local.p2.x += (snap.p2.x - local.p2.x) * 0.4;
        local.p2.y += (snap.p2.y - local.p2.y) * 0.4;
        local.p2.radius = snap.p2.radius;

        ctx.clearRect(-20, -20, CANVAS_SIZE + 40, CANVAS_SIZE + 40);
        drawArena(ctx, THEME.arena, snap.arenaRadius);
        drawPowerUp(ctx, snap.powerUp);
        drawPlayer(ctx, local.p1);
        drawPlayer(ctx, local.p2);
        effects.draw(ctx);
      }
    }

    ctx.restore();
  });

  return (
    <div className="game-container">
      <canvas ref={canvasRef} id="game-canvas" />

      {playMode === 'LOBBY' && (
        <Lobby
          onCreateRoom={createOnlineRoom}
          onJoinRoom={joinOnlineRoom}
          onPlayLocal={startLocalPlay}
          waitingRoomId={waitingRoomId}
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
            <Joystick side="right" onMove={(v) => (joystickP2.current = v)} />
          ) : (
            <>
              <Joystick side="left" onMove={(v) => (joystickP1.current = v)} />
              {playMode === 'LOCAL' && (
                <Joystick side="right" onMove={(v) => (joystickP2.current = v)} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
