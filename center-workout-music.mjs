import fs from "node:fs";

const file = String.raw`D:\MuscleMap Fitness\src\features\workout-log\WorkoutMiniPlayer.tsx`;
let text = fs.readFileSync(file, "utf8");

text = text.replace(
`  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, right: 16 });
`,
""
);

text = text.replace(
`  const toggleExpanded = () => {
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

`,
""
);

text = text.replace("          ref={triggerRef}\n", "");
text = text.replace("          onClick={toggleExpanded}", "          onClick={() => setExpanded((value) => !value)}");
text = text.replace("          style={{ top: popoverPosition.top, right: popoverPosition.right }}\n", "");

const oldAbsolute = `          className={\`absolute right-0 top-[calc(100%+0.55rem)] z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-[24px] border border-white/12 bg-[#111411]/95 p-3.5 text-white shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-200 ease-out \${expanded ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'}\`}`;

const oldFixed = `          className={\`fixed z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-[24px] border border-white/12 bg-[#111411]/95 p-3.5 text-white shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-200 ease-out \${expanded ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'}\`}`;

const centered = `          className={\`fixed left-1/2 top-1/2 z-50 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 origin-center overflow-hidden rounded-[24px] border border-white/12 bg-[#111411]/95 p-3.5 text-white shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-200 ease-out \${expanded ? 'pointer-events-auto -translate-y-1/2 scale-100 opacity-100' : 'pointer-events-none -translate-y-[48%] scale-95 opacity-0'}\`}`;

if (text.includes(oldAbsolute)) {
  text = text.replace(oldAbsolute, centered);
} else if (text.includes(oldFixed)) {
  text = text.replace(oldFixed, centered);
} else {
  throw new Error("Popover class not found. No file was written.");
}

fs.writeFileSync(file, text, "utf8");
console.log("Music popover centered.");
