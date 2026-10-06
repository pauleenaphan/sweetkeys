export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-20">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-cyan-300">
          Sweetkeys
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-normal text-balance sm:text-7xl">
          Keyboard-first tools, wired for the app you are building.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          Prisma, Turso, tRPC, and Turbo are ready. The starter demo has been
          cleared out so the next screen can be yours.
        </p>
      </section>
    </main>
  );
}
