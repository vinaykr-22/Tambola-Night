interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  decay: number;
  shape: "rect" | "circle";
}

const COLORS = [
  "#efa844", // Gold
  "#e75d40", // Coral / Red
  "#2dd4bf", // Teal
  "#4ade80", // Emerald
  "#f472b6", // Pink
  "#a78bfa", // Purple
  "#fbbf24", // Amber
  "#ffffff", // White sparkle
];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let animId: number | null = null;

function ensureCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof window === "undefined") return null;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "tambola-confetti-canvas";
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    document.body.appendChild(canvas);
  }
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }
  ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return ctx ? { canvas, ctx } : null;
}

function updateAndDraw() {
  if (!ctx || !canvas) return;
  const width = window.innerWidth;
  const height = window.innerHeight;

  ctx.clearRect(0, 0, width, height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.28; // gravity
    p.vx *= 0.985; // drag
    p.rotation += p.rotationSpeed;
    p.alpha -= p.decay;

    if (p.alpha <= 0 || p.y > height + 50) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;

    if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    ctx.restore();
  }

  if (particles.length > 0) {
    animId = requestAnimationFrame(updateAndDraw);
  } else {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
      canvas = null;
      ctx = null;
    }
  }
}

export interface ConfettiOptions {
  count?: number;
  origin?: { x: number; y: number };
  spread?: number;
  speed?: number;
}

export function fireConfetti(options?: ConfettiOptions) {
  if (typeof window === "undefined") return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const instance = ensureCanvas();
  if (!instance) return;

  const count = options?.count ?? 65;
  const originX = options?.origin?.x ?? window.innerWidth / 2;
  const originY = options?.origin?.y ?? window.innerHeight * 0.45;
  const spread = options?.spread ?? 70;
  const speed = options?.speed ?? 12;

  for (let i = 0; i < count; i++) {
    const angle = ((-90 + (Math.random() - 0.5) * spread * 2) * Math.PI) / 180;
    const velocity = (Math.random() * 0.65 + 0.5) * speed;
    particles.push({
      x: originX + (Math.random() - 0.5) * 20,
      y: originY + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: Math.floor(Math.random() * 8) + 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      alpha: 1,
      decay: Math.random() * 0.012 + 0.008,
      shape: Math.random() > 0.4 ? "rect" : "circle",
    });
  }

  if (!animId) {
    animId = requestAnimationFrame(updateAndDraw);
  }
}

let continuousTimer: number | null = null;

export function startVictoryConfetti(durationMs = 4000) {
  fireConfetti({ count: 50, origin: { x: window.innerWidth * 0.2, y: window.innerHeight * 0.7 } });
  fireConfetti({ count: 50, origin: { x: window.innerWidth * 0.8, y: window.innerHeight * 0.7 } });

  let elapsed = 0;
  continuousTimer = window.setInterval(() => {
    elapsed += 600;
    if (elapsed >= durationMs) {
      stopVictoryConfetti();
      return;
    }
    const x = Math.random() * window.innerWidth;
    fireConfetti({ count: 25, origin: { x, y: window.innerHeight * 0.5 }, spread: 90, speed: 10 });
  }, 600);
}

export function stopVictoryConfetti() {
  if (continuousTimer) {
    clearInterval(continuousTimer);
    continuousTimer = null;
  }
}
