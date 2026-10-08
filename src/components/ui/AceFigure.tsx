import type { CSSProperties } from "react";

// Ace, the Servly mascot: the one drawing shared by the loader and the welcome tour.
// Every pose is built from the same parts; the motion lives in theme/ace.css. Don't redraw or recolour him.
//   bounce, spin = loading (full body hopping / head-only ball spinning)
//   idle, wave, point, walk, celebrate = the welcome tour
export type AcePose = "bounce" | "spin" | "idle" | "wave" | "point" | "walk" | "celebrate";

type AceFigureProps = {
  pose: AcePose;
  size: number; // px, the drawing sits in a square box this big
  flip?: boolean; // face left instead of right
  once?: boolean; // play the pose a single time instead of looping (the finish-line confetti)
};

export function AceFigure({ pose, size, flip = false, once = false }: AceFigureProps) {
  const style: CSSProperties | undefined = flip ? { transform: "scaleX(-1)" } : undefined;
  return (
    <svg
      className={once ? "ace ace--once" : "ace"}
      viewBox={pose === "spin" ? "26 26 148 148" : "-12 0 224 230"}
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {pose === "spin" ? <SpinPose /> : <FullBody pose={pose} />}
    </svg>
  );
}

// Which wrapper class gives the body its movement
const BODY_MOTION: Record<Exclude<AcePose, "spin">, string> = {
  bounce: "ace-bounce",
  idle: "ace-breathe",
  wave: "ace-breathe",
  point: "ace-breathe",
  walk: "ace-walk-bob",
  celebrate: "ace-jump",
};

const CONFETTI = [
  { x: 30, color: "#f5b301" },
  { x: 54, color: "#72cc3e" },
  { x: 78, color: "#2f6fa3" },
  { x: 100, color: "#0e9aa7" },
  { x: 122, color: "#04355e" },
  { x: 144, color: "#f5b301" },
  { x: 166, color: "#72cc3e" },
  { x: 188, color: "#2f6fa3" },
];

function FullBody({ pose }: { pose: Exclude<AcePose, "spin"> }) {
  const celebrating = pose === "celebrate";
  return (
    <>
      <ellipse className={pose === "bounce" ? "ace-shadow" : undefined} cx="100" cy="214" rx="44" ry="6" fill="#04355e" fillOpacity="0.14" />
      {celebrating &&
        CONFETTI.map((piece, n) => (
          <rect
            key={piece.x}
            className="ace-conf"
            x={piece.x}
            y="-8"
            width="8"
            height="5"
            rx="1"
            fill={piece.color}
            style={{ animationDelay: `${n * 0.12}s` }}
          />
        ))}
      <g className={BODY_MOTION[pose]}>
        <Legs walking={pose === "walk"} />
        {celebrating ? <ArmsUp /> : <ArmLeftDown />}
        {pose === "wave" ? <WaveArm /> : pose === "point" ? <PointArm /> : !celebrating && <ArmRightDown />}
        <Head pose={pose} />
      </g>
    </>
  );
}

// Each leg, shoe and lace is its own group so the walk can swing them from the hip
function Legs({ walking }: { walking: boolean }) {
  return (
    <>
      <g className={walking ? "ace-leg-l" : undefined}>
        <line x1="86" y1="166" x2="80" y2="198" stroke="#04355e" strokeWidth="6" strokeLinecap="round" />
        <path d="M58 207 Q58 195 74 195 L84 197 Q92 201 90 209 L61 211 Q58 211 58 207 Z" fill="#fff" stroke="#04355e" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="76" cy="201" r="2.5" fill="#72cc3e" />
      </g>
      <g className={walking ? "ace-leg-r" : undefined}>
        <line x1="114" y1="166" x2="120" y2="198" stroke="#04355e" strokeWidth="6" strokeLinecap="round" />
        <path d="M142 207 Q142 195 126 195 L116 197 Q108 201 110 209 L139 211 Q142 211 142 207 Z" fill="#fff" stroke="#04355e" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="124" cy="201" r="2.5" fill="#72cc3e" />
      </g>
    </>
  );
}

function ArmLeftDown() {
  return (
    <>
      <path d="M40 112 Q24 122 20 134" fill="none" stroke="#04355e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="19" cy="138" r="7.5" fill="#fff" stroke="#04355e" strokeWidth="3" />
    </>
  );
}

function ArmRightDown() {
  return (
    <>
      <path d="M160 112 Q176 122 180 134" fill="none" stroke="#04355e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="181" cy="138" r="7.5" fill="#fff" stroke="#04355e" strokeWidth="3" />
    </>
  );
}

function WaveArm() {
  return (
    <g className="ace-wave">
      <path d="M160 96 Q180 86 184 66" fill="none" stroke="#04355e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="185" cy="60" r="7.5" fill="#fff" stroke="#04355e" strokeWidth="3" />
    </g>
  );
}

// Points to the right; flip the whole figure to point left
function PointArm() {
  return (
    <g className="ace-nudge">
      <path d="M162 104 L190 98" fill="none" stroke="#04355e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="195" cy="97" r="7.5" fill="#fff" stroke="#04355e" strokeWidth="3" />
    </g>
  );
}

function ArmsUp() {
  return (
    <>
      <path d="M40 88 Q24 74 24 56" fill="none" stroke="#04355e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="24" cy="50" r="7.5" fill="#fff" stroke="#04355e" strokeWidth="3" />
      <path d="M160 88 Q176 74 176 56" fill="none" stroke="#04355e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="176" cy="50" r="7.5" fill="#fff" stroke="#04355e" strokeWidth="3" />
    </>
  );
}

function Head({ pose }: { pose: Exclude<AcePose, "spin"> }) {
  const happyEyes = pose === "celebrate";
  const openSmile = pose === "wave" || pose === "celebrate";
  // The loader's hop has never blinked; everything else does
  const blinks = pose !== "bounce" && !happyEyes;

  return (
    <>
      <circle cx="100" cy="100" r="70" fill="#72cc3e" stroke="#04355e" strokeWidth="4" />
      <g fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round">
        <path d="M44 62 C76 86 76 114 44 138" />
        <path d="M156 62 C124 86 124 114 156 138" />
      </g>
      <path d="M55.5 46 L144.5 46 A70 70 0 0 1 157.4 60 L42.6 60 A70 70 0 0 1 55.5 46 Z" fill="#04355e" />
      <line x1="50" y1="53" x2="150" y2="53" stroke="#fff" strokeWidth="2.5" />
      <path d="M60 84 A46 46 0 0 1 74 68" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" />
      <circle cx="70" cy="120" r="6" fill="#2f7d1a" fillOpacity="0.22" />
      <circle cx="130" cy="120" r="6" fill="#2f7d1a" fillOpacity="0.22" />
      {happyEyes ? (
        <g fill="none" stroke="#021f38" strokeWidth="4.5" strokeLinecap="round">
          <path d="M76 103 Q84 93 92 103" />
          <path d="M108 103 Q116 93 124 103" />
        </g>
      ) : (
        <g className={blinks ? "ace-blink" : undefined}>
          <ellipse cx="84" cy="100" rx="8" ry="11" fill="#021f38" />
          <ellipse cx="116" cy="100" rx="8" ry="11" fill="#021f38" />
          <circle cx="86.5" cy="96" r="3" fill="#fff" />
          <circle cx="118.5" cy="96" r="3" fill="#fff" />
        </g>
      )}
      {openSmile ? (
        <path d="M88 118 Q100 138 112 118 Z" fill="#021f38" stroke="#021f38" strokeWidth="2" strokeLinejoin="round" />
      ) : (
        <path d="M90 121 Q100 131 110 121" fill="none" stroke="#021f38" strokeWidth="4.5" strokeLinecap="round" />
      )}
    </>
  );
}

// Head-only ball for small inline spots (buttons, rows)
function SpinPose() {
  return (
    <g className="ace-spin">
      <circle cx="100" cy="100" r="70" fill="#72cc3e" stroke="#04355e" strokeWidth="6" />
      <g fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round">
        <path d="M44 62 C76 86 76 114 44 138" />
        <path d="M156 62 C124 86 124 114 156 138" />
      </g>
      <path d="M55.5 46 L144.5 46 A70 70 0 0 1 157.4 60 L42.6 60 A70 70 0 0 1 55.5 46 Z" fill="#04355e" />
      <g fill="none" stroke="#021f38" strokeWidth="6" strokeLinecap="round">
        <path d="M76 103 Q84 93 92 103" />
        <path d="M108 103 Q116 93 124 103" />
      </g>
      <path d="M90 121 Q100 131 110 121" fill="none" stroke="#021f38" strokeWidth="6" strokeLinecap="round" />
    </g>
  );
}
