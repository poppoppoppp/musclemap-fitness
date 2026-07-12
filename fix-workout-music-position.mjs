import fs from "node:fs";

const file = String.raw`D:\MuscleMap Fitness\src\features\workout-log\WorkoutMiniPlayer.tsx`;

if (!fs.existsSync(file)) {
  throw new Error("WorkoutMiniPlayer.tsx not found");
}

let text = fs.readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
text = text.replace(/\r\n/g, "\n");

function replaceOnce(oldText, newText) {
  if (!text.includes(oldText)) {
    throw new Error("Expected code block not found");
  }
  text = text.replace(oldText, newText);
}

replaceOnce(
  "  const containerRef = useRef<HTMLDivElement | null>(null);\n  const [expanded, setExpanded] = useState(false);",
  "  const containerRef = useRef<HTMLDivElement | null>(null);\n  const triggerRef = useRef<HTMLButtonElement | null>(null);\n  const [popoverPosition, setPopoverPosition] = useState({ top: 0, right: 16 });\n  const [expanded, setExpanded] = useState(false);"
);

replaceOnce(
  "  if (compact) {",
  "  const toggleExpanded = () => {\n    if (!expanded) {\n      const rect = triggerRef.current?.getBoundingClientRect();\n      if (rect) {\n        setPopoverPosition({\n          top: rect.bottom + 8,\n          right: Math.max(16, window.innerWidth - rect.right)\n        });\n      }\n    }\n    setExpanded((value) => !value);\n  };\n\n  if (compact) {"
);

replaceOnce(
  "        <button\n          type=\"button\"\n          data-testid=\"workout-mini-player\"\n          onClick={() => setExpanded((value) => !value)}",
  "        <button\n          ref={triggerRef}\n          type=\"button\"\n          data-testid=\"workout-mini-player\"\n          onClick={toggleExpanded}"
);

replaceOnce(
  "          className={`absolute right-0 top-[calc(100%+0.55rem)] z-50 ",
  "          style={{ top: popoverPosition.top, right: popoverPosition.right }}\n          className={`fixed z-50 "
);

fs.writeFileSync(file, text.replace(/\n/g, eol), "utf8");

console.log("Position fix applied.");
console.log("Next command: npm run build");
