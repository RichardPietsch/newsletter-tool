'use client';

export function SideRail({ onExport }: { onExport: () => void }) {
  return (
    <nav className="flex w-20 flex-col items-center gap-3 border-r bg-white py-4" aria-label="Funktionsleiste">
      <a className="rounded p-3" href="/newsletters" aria-label="Newsletter-Liste">📋</a>
      <form action="/api/newsletters" method="post"><button className="rounded p-3" aria-label="Neuer Newsletter">➕</button></form>
      <a className="rounded p-3" href="/newsletters?assets=1" aria-label="Assets">🖼️</a>
      <a className="rounded p-3" href="/settings" aria-label="Einstellungen">⚙️</a>
      <a className="rounded p-3" href="/account" aria-label="Account">👤</a>
      <button onClick={onExport} className="rounded p-3" aria-label="Export">⬇️</button>
    </nav>
  );
}
