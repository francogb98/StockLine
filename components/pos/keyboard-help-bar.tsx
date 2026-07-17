"use client";

export function KeyboardHelpBar() {
  const shortcuts = [
    { key: "Alt+F", label: "Buscar" },
    { key: "Alt+D", label: "Productos" },
    { key: "Alt+C", label: "Cobrar" },
    { key: "Alt+P", label: "Pago" },
    { key: "Alt+H", label: "Ayuda" },
  ];

  return (
    <div className="flex items-center gap-3">
      {shortcuts.map(({ key, label }) => (
        <span key={key} className="flex items-center gap-1">
          <kbd className="rounded border bg-muted px-1 font-mono text-[10px] font-medium">
            {key}
          </kbd>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
