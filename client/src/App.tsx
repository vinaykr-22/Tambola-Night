import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Copy,
  Crown,
  Dices,
  FastForward,
  LogIn,
  LogOut,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import QRCode from "qrcode";
import {
  CONDITION_LABELS,
  RoomState,
  WinningCondition,
  Winner,
  TAMBOLA_NICKNAMES,
} from "@tambola/shared";
import "./exit.css";

const fallbackServerUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
const socket: Socket = io(import.meta.env.VITE_SERVER_URL ?? fallbackServerUrl, { autoConnect: true });

const allConditions: WinningCondition[] = [
  "earlyFive",
  "earlySeven",
  "topLine",
  "middleLine",
  "bottomLine",
  "fourCorners",
  "star",
  "fullHouse",
  "secondFullHouse",
];

const defaultConditions: WinningCondition[] = [
  "earlyFive",
  "topLine",
  "middleLine",
  "bottomLine",
  "fourCorners",
  "fullHouse",
];

type View = "home" | "create" | "join" | "room";

interface FloatingReaction {
  id: string;
  emoji: string;
  nickname: string;
  x: number;
}

interface BogusAlert {
  nickname: string;
  condition: WinningCondition;
  reason: string;
}

export default function App() {
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem("tambola-session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.roomId && session.resumeToken) return "room";
      } catch {
        localStorage.removeItem("tambola-session");
      }
    }
    return "home";
  });
  const [room, setRoom] = useState<RoomState | null>(null);
  const [roomCode, setRoomCode] = useState(() => {
    const saved = localStorage.getItem("tambola-session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.roomId) return session.roomId;
      } catch {}
    }
    return "";
  });
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState<Winner | null>(null);
  const [bogus, setBogus] = useState<BogusAlert | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(() => {
    return localStorage.getItem("tambola-speech") !== "false";
  });

  const toggleSpeech = () => {
    setSpeechEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("tambola-speech", String(next));
      if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get("join");
    if (joinParam) {
      setRoomCode(joinParam.toUpperCase());
      const saved = localStorage.getItem("tambola-session");
      if (!saved) {
        setView("join");
      }
    }

    const resume = () => {
      const saved = localStorage.getItem("tambola-session");
      if (saved) {
        try {
          const session = JSON.parse(saved);
          if (session.roomId && session.resumeToken) {
            socket.emit("room:reconnect", { resumeToken: session.resumeToken });
          }
        } catch {
          localStorage.removeItem("tambola-session");
        }
      }
    };

    const onState = (nextRoom: RoomState) => {
      setRoom(nextRoom);
      setRoomCode(nextRoom.id);
      setView("room");
    };

    const onError = (errMsg: string) => {
      setMessage(errMsg);
      if (
        errMsg.includes("could not resume") ||
        errMsg.includes("Join the room again") ||
        errMsg.includes("Room not found") ||
        errMsg.includes("expired")
      ) {
        localStorage.removeItem("tambola-session");
        setRoom(null);
        setRoomCode("");
        setView("home");
      }
    };

    const onBogus = (data: BogusAlert) => {
      setBogus(data);
      setTimeout(() => setBogus(null), 4000);
    };

    const onReaction = (data: { id: string; emoji: string; nickname: string }) => {
      const newReaction: FloatingReaction = {
        ...data,
        x: Math.floor(Math.random() * 64) + 18,
      };
      setReactions((prev) => [...prev, newReaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== data.id));
      }, 2600);
    };

    socket.on("connect", resume);
    socket.on("room:state", onState);
    socket.on("room:created", (id: string) => {
      const saved = JSON.parse(localStorage.getItem("tambola-session") ?? "{}");
      localStorage.setItem("tambola-session", JSON.stringify({ ...saved, roomId: id }));
      setRoomCode(id);
      setView("room");
    });
    socket.on("app:error", onError);
    socket.on("claim:success", setWinner);
    socket.on("claim:bogus", onBogus);
    socket.on("room:reaction", onReaction);

    if (socket.connected) resume();
    else socket.connect();

    return () => {
      socket.off("connect", resume);
      socket.off("room:state", onState);
      socket.off("room:created");
      socket.off("app:error");
      socket.off("claim:success");
      socket.off("claim:bogus", onBogus);
      socket.off("room:reaction", onReaction);
    };
  }, []);

  const exitRoom = () => {
    if (!window.confirm("Are you sure you want to exit this game?")) return;
    localStorage.removeItem("tambola-session");
    socket.disconnect();
    setRoom(null);
    setRoomCode("");
    setWinner(null);
    setMessage("");
    setView("home");
  };

  const sendReaction = (emoji: string) => {
    if (!room) return;
    const mine = room.players.find((player) => player.id === socket.id);
    if (!mine) return;
    socket.emit("room:reaction", {
      roomId: room.id,
      emoji,
      nickname: mine.nickname,
    });
  };

  if (view === "home") {
    return <Home onCreate={() => setView("create")} onJoin={() => setView("join")} />;
  }

  if (view === "create") {
    return (
      <Create
        onBack={() => setView("home")}
        onSubmit={(payload) => {
          const resumeToken = crypto.randomUUID();
          localStorage.setItem(
            "tambola-session",
            JSON.stringify({ roomId: "", nickname: payload.nickname, resumeToken })
          );
          socket.connect();
          socket.emit("room:create", { ...payload, resumeToken });
        }}
      />
    );
  }

  if (view === "join") {
    return (
      <Join
        initialCode={roomCode}
        onBack={() => setView("home")}
        onSubmit={(payload) => {
          const resumeToken = crypto.randomUUID();
          localStorage.setItem(
            "tambola-session",
            JSON.stringify({
              roomId: payload.roomId.toUpperCase(),
              nickname: payload.nickname,
              resumeToken,
            })
          );
          socket.connect();
          setRoomCode(payload.roomId.toUpperCase());
          socket.emit("room:join", { ...payload, resumeToken });
          setView("room");
        }}
      />
    );
  }

  return (
    <RoomScreen
      room={room}
      roomCode={roomCode}
      message={message}
      clearMessage={() => setMessage("")}
      winner={winner}
      closeWinner={() => setWinner(null)}
      bogus={bogus}
      closeBogus={() => setBogus(null)}
      reactions={reactions}
      onSendReaction={sendReaction}
      onExit={exitRoom}
      speechEnabled={speechEnabled}
      toggleSpeech={toggleSpeech}
    />
  );
}

function Home({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <main className="landing">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hero">
        <p className="eyebrow">A private party game</p>
        <h1>
          Tambola
          <br />
          <i>Night</i>
        </h1>
        <p className="lede">Your friends. Your tickets. Your lucky numbers.</p>
        <div className="actions">
          <button className="primary" onClick={onCreate}>
            <Dices /> Create game
          </button>
          <button className="secondary" onClick={onJoin}>
            <LogIn /> Join with code
          </button>
        </div>
        <p className="mini">Built for phones, perfect for the living room.</p>
      </motion.section>
    </main>
  );
}

function Create({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (p: {
    nickname: string;
    name: string;
    conditions: WinningCondition[];
    allowMultipleWinners: boolean;
    ticketCount: number;
  }) => void;
}) {
  const [conditions, setConditions] = useState<WinningCondition[]>(defaultConditions);
  const [ticketCount, setTicketCount] = useState(1);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSubmit({
      nickname: String(data.get("nickname")),
      name: String(data.get("name")),
      conditions,
      allowMultipleWinners: Boolean(data.get("multiple")),
      ticketCount,
    });
  };

  return (
    <Page title="Set the table" subtitle="Create a private room for your crew.">
      <form onSubmit={submit} className="form">
        <label>
          Your name
          <input required name="nickname" maxLength={20} placeholder="e.g. Vinay" autoFocus />
        </label>
        <label>
          Room name
          <input required name="name" maxLength={30} placeholder="Friday night bingo" />
        </label>
        <div className="ticket-count-field">
          <span>Tickets to play</span>
          <div className="ticket-count-pills">
            {[1, 2, 3].map((num) => (
              <button
                type="button"
                key={num}
                className={`pill ${ticketCount === num ? "active" : ""}`}
                onClick={() => setTicketCount(num)}
              >
                {num} {num === 1 ? "Ticket" : "Tickets"}
              </button>
            ))}
          </div>
        </div>
        <fieldset>
          <legend>Winning conditions</legend>
          {allConditions.map((condition) => (
            <label className="check" key={condition}>
              <input
                type="checkbox"
                checked={conditions.includes(condition)}
                onChange={() =>
                  setConditions((current) =>
                    current.includes(condition)
                      ? current.filter((item) => item !== condition)
                      : [...current, condition]
                  )
                }
              />
              {CONDITION_LABELS[condition]}
            </label>
          ))}
        </fieldset>
        <label className="check">
          <input type="checkbox" name="multiple" /> Allow multiple winners per prize
        </label>
        <button className="primary" type="submit">
          <Crown /> Create game
        </button>
        <button className="text-button" type="button" onClick={onBack}>
          Back
        </button>
      </form>
    </Page>
  );
}

function Join({
  initialCode = "",
  onBack,
  onSubmit,
}: {
  initialCode?: string;
  onBack: () => void;
  onSubmit: (p: { nickname: string; roomId: string; ticketCount: number }) => void;
}) {
  const [ticketCount, setTicketCount] = useState(1);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSubmit({
      nickname: String(data.get("nickname")),
      roomId: String(data.get("roomId")),
      ticketCount,
    });
  };

  return (
    <Page title="Find your table" subtitle="Ask the host for the five-character room code.">
      <form onSubmit={submit} className="form">
        <label>
          Your name
          <input required name="nickname" maxLength={20} placeholder="e.g. Rahul" autoFocus />
        </label>
        <label>
          Room code
          <input
            required
            name="roomId"
            defaultValue={initialCode}
            maxLength={5}
            className="code-input"
            placeholder="XK72P"
          />
        </label>
        <div className="ticket-count-field">
          <span>Tickets to play</span>
          <div className="ticket-count-pills">
            {[1, 2, 3].map((num) => (
              <button
                type="button"
                key={num}
                className={`pill ${ticketCount === num ? "active" : ""}`}
                onClick={() => setTicketCount(num)}
              >
                {num} {num === 1 ? "Ticket" : "Tickets"}
              </button>
            ))}
          </div>
        </div>
        <button className="primary" type="submit">
          <LogIn /> Join game
        </button>
        <button className="text-button" type="button" onClick={onBack}>
          Back
        </button>
      </form>
    </Page>
  );
}

function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="simple-page">
      <section className="form-card">
        <p className="eyebrow">Tambola night</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {children}
      </section>
    </main>
  );
}

function RoomScreen({
  room,
  roomCode,
  message,
  clearMessage,
  winner,
  closeWinner,
  bogus,
  closeBogus,
  reactions,
  onSendReaction,
  onExit,
  speechEnabled,
  toggleSpeech,
}: {
  room: RoomState | null;
  roomCode: string;
  message: string;
  winner: Winner | null;
  closeWinner: () => void;
  bogus: BogusAlert | null;
  closeBogus: () => void;
  reactions: FloatingReaction[];
  onSendReaction: (emoji: string) => void;
  clearMessage: () => void;
  onExit: () => void;
  speechEnabled: boolean;
  toggleSpeech: () => void;
}) {
  if (!room) {
    return (
      <main className="simple-page">
        <section className="form-card">
          <p className="eyebrow">Joining room</p>
          <h2>{roomCode}</h2>
          <p>Connecting you to the game...</p>
        </section>
      </main>
    );
  }

  const mine = room.players.find((player) => player.id === socket.id);
  const host = room.hostId === socket.id;

  return (
    <main className="game">
      <header>
        <div>
          <p className="eyebrow">Room {room.id}</p>
          <h2>{room.name}</h2>
        </div>
        <div className="header-actions">
          <button
            className={`audio-toggle ${speechEnabled ? "active" : ""}`}
            onClick={toggleSpeech}
            title={speechEnabled ? "Mute caller audio" : "Unmute caller audio"}
            aria-label="Toggle caller audio"
          >
            {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className="players">
            <Users size={18} /> {room.players.filter((player) => player.connected).length}
          </div>
          <button className="exit-button" onClick={onExit}>
            <LogOut size={16} /> Exit
          </button>
        </div>
      </header>

      {/* Floating live emojis */}
      <div className="floating-container" aria-hidden="true">
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 30, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -300, scale: [0.6, 1.25, 1.1, 0.8] }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            style={{ left: `${r.x}%` }}
            className="floating-bubble"
          >
            <span className="bubble-emoji">{r.emoji}</span>
            <span className="bubble-name">{r.nickname}</span>
          </motion.div>
        ))}
      </div>

      {message && (
        <button className="notice" onClick={clearMessage}>
          {message}
        </button>
      )}

      {/* Bogus claim alert */}
      <AnimatePresence>
        {bogus && (
          <motion.div
            className="bogus-banner"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            onClick={closeBogus}
          >
            <AlertTriangle className="bogus-icon" size={24} />
            <div>
              <strong>BOGUS CLAIM! 🙈</strong>
              <p>
                {bogus.nickname} claimed {CONDITION_LABELS[bogus.condition]}, but the pattern was
                incomplete!
              </p>
            </div>
            <button className="bogus-dismiss" onClick={closeBogus}>
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Valid Winner Modal */}
      <AnimatePresence>
        {winner && (
          <motion.div
            className="modal-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="winner"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
            >
              <Trophy />
              <p className="eyebrow">Claim successful</p>
              <h2>{winner.nickname}</h2>
              <p>{CONDITION_LABELS[winner.condition]}</p>
              <button className="primary" onClick={closeWinner}>
                Keep playing
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {room.status === "lobby" ? (
        <Lobby room={room} host={host} />
      ) : room.status === "finished" ? (
        <Podium
          room={room}
          host={host}
          onRematch={() => socket.emit("game:rematch", room.id)}
        />
      ) : (
        <Game
          room={room}
          mine={mine}
          host={host}
          speechEnabled={speechEnabled}
          onSendReaction={onSendReaction}
        />
      )}
    </main>
  );
}

function Lobby({ room, host }: { room: RoomState; host: boolean }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${room.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const openQr = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(inviteUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: "#12231e",
          light: "#fff5df",
        },
      });
      setQrDataUrl(dataUrl);
      setShowQr(true);
    } catch (err) {
      console.error("Failed to generate QR code", err);
    }
  };

  return (
    <section className="lobby">
      <div className="room-code">
        <span>Share this code</span>
        <strong>{room.id}</strong>
        <small>Friends can join before you start.</small>

        <div className="lobby-share-actions">
          <button className="share-btn" onClick={copyLink} title="Copy invite link">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button className="share-btn" onClick={openQr} title="Scan QR code">
            <QrCode size={16} /> QR Code
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showQr && qrDataUrl && (
          <motion.div
            className="modal-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQr(false)}
          >
            <motion.div
              className="qr-card"
              initial={{ scale: 0.85, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="qr-card-header">
                <div>
                  <p className="eyebrow">Scan to join</p>
                  <h3>Room {room.id}</h3>
                </div>
                <button className="icon-close" onClick={() => setShowQr(false)}>
                  <X size={20} />
                </button>
              </div>
              <img src={qrDataUrl} alt={`QR code to join room ${room.id}`} className="qr-img" />
              <p className="qr-hint">Scan with any phone camera to join automatically</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <h3>
        <Users /> At the table
      </h3>
      <div className="player-list">
        {room.players.map((player) => (
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} key={player.id}>
            <span>
              {player.nickname}
              {player.tickets && player.tickets.length > 1 && (
                <span className="tickets-badge">{player.tickets.length} tickets</span>
              )}
            </span>
            {player.id === room.hostId && <Crown size={15} />}
          </motion.div>
        ))}
      </div>

      {host ? (
        <button className="primary start" onClick={() => socket.emit("game:start", room.id)}>
          <Play /> Start game
        </button>
      ) : (
        <p className="waiting">
          Waiting for {room.players.find((p) => p.id === room.hostId)?.nickname} to start...
        </p>
      )}
    </section>
  );
}

function Podium({
  room,
  host,
  onRematch,
}: {
  room: RoomState;
  host: boolean;
  onRematch: () => void;
}) {
  return (
    <section className="podium-card">
      <motion.div
        initial={{ scale: 0.6, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        className="podium-trophy"
      >
        <Trophy size={68} />
      </motion.div>

      <p className="eyebrow">Game complete</p>
      <h2>Housie Concluded!</h2>
      <p className="podium-sub">
        All prizes have been claimed after {room.calledNumbers.length} numbers called.
      </p>

      <div className="podium-winners-list">
        <h3>
          <Sparkles size={18} /> Honor Roll
        </h3>
        {room.winners.length > 0 ? (
          room.winners.map((win, idx) => (
            <motion.div
              key={`${win.playerId}-${win.condition}-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="podium-winner-row"
            >
              <div className="podium-condition">{CONDITION_LABELS[win.condition]}</div>
              <div className="podium-name">
                <Crown size={14} /> {win.nickname}
              </div>
            </motion.div>
          ))
        ) : (
          <p className="waiting">No winners recorded.</p>
        )}
      </div>

      <div className="podium-actions">
        {host ? (
          <button className="primary rematch-btn" onClick={onRematch}>
            <RotateCcw size={18} /> Start Next Round
          </button>
        ) : (
          <p className="waiting">
            Waiting for {room.players.find((p) => p.id === room.hostId)?.nickname} to start the next
            round...
          </p>
        )}
      </div>
    </section>
  );
}

function Game({
  room,
  mine,
  host,
  speechEnabled,
  onSendReaction,
}: {
  room: RoomState;
  mine: RoomState["players"][number] | undefined;
  host: boolean;
  speechEnabled: boolean;
  onSendReaction: (emoji: string) => void;
}) {
  const [autoSpeed, setAutoSpeed] = useState(8);
  const [manualDaub, setManualDaub] = useState(false);
  const [manualMarked, setManualMarked] = useState<Set<number>>(new Set());
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);

  const called = new Set(room.calledNumbers);
  const caller = room.players.find((player) => player.id === room.currentCallerId);
  const canCall =
    room.status === "playing" &&
    (room.callingMode === "host" ? host : room.currentCallerId === socket.id);
  const callerText =
    room.callingMode === "host"
      ? "Host controls the draw"
      : `${caller?.nickname ?? "A player"}'s turn to draw`;

  const myTickets =
    mine?.tickets && mine.tickets.length > 0
      ? mine.tickets
      : mine
      ? [mine.ticket]
      : [];
  const activeTicket = myTickets[activeTicketIndex] ?? myTickets[0];

  // Announce drawn number via Web Speech API
  useEffect(() => {
    if (
      !room.currentNumber ||
      !speechEnabled ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }
    window.speechSynthesis.cancel();
    const nickname = TAMBOLA_NICKNAMES[room.currentNumber];
    const text = nickname
      ? `Number ${room.currentNumber}. ${nickname}`
      : `Number ${room.currentNumber}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }, [room.currentNumber, speechEnabled]);

  // Handle cell daub in manual mode
  const handleCellClick = (number: number | null) => {
    if (number === null) return;
    if (!manualDaub) return;

    if (!called.has(number)) {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([40, 40, 40]);
      }
      return;
    }

    setManualMarked((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(30);
      }
      return next;
    });
  };

  const recentCalls = room.calledNumbers.slice(-5).reverse();
  const currentNickname = room.currentNumber ? TAMBOLA_NICKNAMES[room.currentNumber] : null;

  return (
    <section className="game-grid">
      <div className="draw-card">
        <p className="eyebrow">Last number</p>
        <motion.div
          key={room.currentNumber}
          initial={{ scale: 0.5, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          className="ball"
        >
          {room.currentNumber ?? "?"}
        </motion.div>

        {currentNickname && (
          <motion.p
            key={`nickname-${room.currentNumber}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="ball-nickname"
          >
            “{currentNickname}”
          </motion.p>
        )}

        <p className="call-progress">{room.calledNumbers.length} of 90 called</p>
        <p className="turn-status">{callerText}</p>

        {room.autoCallInterval && (
          <div className="autocall-indicator">
            <span className="pulse-dot" /> Auto-drawing every {room.autoCallInterval}s
          </div>
        )}

        {canCall && (
          <button className="primary" onClick={() => socket.emit("game:callNext", room.id)}>
            {room.callingMode === "turns" ? "Draw your number" : "Call next number"}
          </button>
        )}
        {room.callingMode === "turns" && !canCall && (
          <p className="waiting">Waiting for {caller?.nickname ?? "the next player"}...</p>
        )}

        {host && (
          <>
            <div className="autocall-panel">
              <div className="autocall-header">
                <span>Auto-Draw Timer</span>
                <div className="speed-pills">
                  {[5, 8, 10, 15].map((speed) => (
                    <button
                      key={speed}
                      className={`pill ${autoSpeed === speed ? "active" : ""}`}
                      disabled={Boolean(room.autoCallInterval)}
                      onClick={() => setAutoSpeed(speed)}
                    >
                      {speed}s
                    </button>
                  ))}
                </div>
              </div>
              <div className="autocall-actions">
                {room.autoCallInterval ? (
                  <button
                    className="autocall-btn stop"
                    onClick={() => socket.emit("game:stopAutoCall", room.id)}
                  >
                    <Pause size={15} /> Pause Auto-Draw
                  </button>
                ) : (
                  <button
                    className="autocall-btn start"
                    onClick={() =>
                      socket.emit("game:startAutoCall", { roomId: room.id, interval: autoSpeed })
                    }
                  >
                    <FastForward size={15} /> Start Auto-Draw ({autoSpeed}s)
                  </button>
                )}
              </div>
            </div>

            <div className="mode-switch">
              <span>Calling mode</span>
              <div>
                <button
                  className={room.callingMode === "host" ? "selected" : ""}
                  onClick={() =>
                    socket.emit("game:setCallingMode", { roomId: room.id, mode: "host" })
                  }
                >
                  Host calls
                </button>
                <button
                  className={room.callingMode === "turns" ? "selected" : ""}
                  onClick={() =>
                    socket.emit("game:setCallingMode", { roomId: room.id, mode: "turns" })
                  }
                >
                  Player turns
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {recentCalls.length > 0 && (
        <div className="recent-card">
          <div className="recent-header">
            <h3>Recent calls</h3>
            <span className="recent-badge">Last 5</span>
          </div>
          <div className="recent-strip">
            {recentCalls.map((number, idx) => (
              <motion.div
                key={number}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`recent-ball ${idx === 0 ? "latest" : ""}`}
              >
                <span className="num">{number}</span>
                {idx === 0 && <span className="tag">Now</span>}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTicket && (
        <div className="ticket-wrap">
          <div className="ticket-header">
            <div>
              <h3>Your ticket</h3>
              {myTickets.length > 1 && (
                <div className="ticket-tabs">
                  {myTickets.map((_, i) => (
                    <button
                      key={i}
                      className={`ticket-tab ${activeTicketIndex === i ? "active" : ""}`}
                      onClick={() => setActiveTicketIndex(i)}
                    >
                      Ticket #{i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={`daub-toggle ${manualDaub ? "active" : ""}`}
              onClick={() => setManualDaub((prev) => !prev)}
              title="Toggle Manual / Auto Daub"
            >
              {manualDaub ? "Tap to Mark ✍️" : "Auto-Mark 🪄"}
            </button>
          </div>
          <div className="ticket">
            {activeTicket.flatMap((row, r) =>
              row.map((number, c) => {
                const isMarked = manualDaub
                  ? number !== null && manualMarked.has(number)
                  : number !== null && called.has(number);
                return (
                  <button
                    key={`${r}-${c}`}
                    disabled={number === null}
                    onClick={() => handleCellClick(number)}
                    className={`cell ${isMarked ? "called" : ""} ${
                      manualDaub && number && called.has(number) && !isMarked ? "unmarked-call" : ""
                    }`}
                  >
                    {number ?? ""}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="claims">
        <h3>
          <Trophy /> Claim a win
        </h3>
        {room.winningConditions.map((condition) => {
          const isWon = room.winners.some((w) => w.condition === condition);
          const isDisabled =
            (isWon && !room.allowMultipleWinners) ||
            (condition === "secondFullHouse" &&
              !room.winners.some((w) => w.condition === "fullHouse"));

          return (
            <button
              key={condition}
              disabled={isDisabled}
              onClick={() => socket.emit("claim:submit", { roomId: room.id, condition })}
            >
              {CONDITION_LABELS[condition]}
              {isWon && <span>Won</span>}
            </button>
          );
        })}
      </div>

      <div className="board">
        <h3>Number board</h3>
        <div>
          {Array.from({ length: 90 }, (_, index) => index + 1).map((number) => (
            <span
              key={number}
              className={
                called.has(number)
                  ? number === room.currentNumber
                    ? "current"
                    : "marked"
                  : ""
              }
            >
              {number}
            </span>
          ))}
        </div>
      </div>

      {/* Floating Reactions Bar */}
      <div className="reactions-bar">
        <span>React:</span>
        <div className="reactions-buttons">
          {["🎉", "😱", "🔥", "🍻", "👑", "👀", "1 Away!"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="reaction-btn"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
