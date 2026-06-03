export default function Home() {
  return (
    <main className="h-screen flex items-center justify-center bg-paper">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          LifeGuide<span className="text-gold">.</span>
        </h1>
        <p className="text-lg text-ink-soft mt-3">Your space.</p>
        <p className="text-sm text-ink-mute mt-6 max-w-sm mx-auto">
          Frontend scaffold is live. Backend (Convex + auth) wires in next, then the
          Whiteboard surface lands here.
        </p>
      </div>
    </main>
  );
}
