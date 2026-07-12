import fs from "node:fs";

const file = String.raw`D:\MuscleMap Fitness\src\features\workout-log\WorkoutMiniPlayer.tsx`;

if (!fs.existsSync(file)) {
  throw new Error("WorkoutMiniPlayer.tsx not found");
}

let text = fs.readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
text = text.replace(/\r\n/g, "\n");

text = text.replace(
  "  const triggerRef = useRef<HTMLButtonElement | null>(null);\n",
  ""
);

text = text.replace(
  "  const [popoverPosition, setPopoverPosition] = useState({ top: 0, right: 16 });\n",
  ""
);

const toggleBlock = `  const toggleExpanded = () => {
    if (!expanded) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setPopoverPosition({
          top: rect.bottom + 8,
          right: Math.max(16, window.innerWidth - rect.right)
        });
      }
    }
    setExpanded((value) => !value);
  };

`;

text = text.replace(toggleBlock, "");
text = text.replace("          ref={triggerRef}\n", "");
text = text.replace(
  "          onClick={toggleExpanded}",
  "          onClick={() => setExpanded((value) => !value)}"
);

text = text.replace(
  "          style={{ top: popoverPosition.top, right: popoverPosition.right }}\n",
  ""
);

const lines = text.split("\n");

const classIndex = lines.findIndex(
  (line) =>
    line.includes("w-[min(20rem,calc(100vw-2rem))]") &&
    line.includes("shadow-[0_22px_60px")
);

if (classIndex === -1) {
  throw new Error("Music popover class not found");
}

lines[classIndex] =
  "          className={`fixed left-1/2 top-[calc(env(safe-area-inset-top)+10.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] max-h-[calc(100dvh-12rem)] -translate-x-1/2 origin-top overflow-y-auto rounded-[24px] border border-white/12 bg-[#111411]/95 p-3.5 text-white shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-200 ease-out ${expanded ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'}`}";

text = lines.join("\n");
fs.writeFileSync(file, text.replace(/\n/g, eol), "utf8");

console.log("Music popover moved over workout timer.");
console.log("Next: npm run build");
