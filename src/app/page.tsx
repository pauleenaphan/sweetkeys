"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { api } from "~/trpc/react";

type Recipe = {
  id: string;
  dessert: string;
  bubbleSrc: string;
  ingredients: [string, string, string];
};

type CustomerPhase = "neutral" | "waiting" | "mad";
type Screen = "title" | "playing";
type TitleOverlay = "leaderboard" | "instructions" | null;

const recipes: Recipe[] = [
  {
    id: "chocolate-chip-cookies",
    dessert: "chocolate chip cookies",
    bubbleSrc: "/foods/chocolate-chip-cookie-bubble.png",
    ingredients: ["cookie dough", "chocolate chips", "brown sugar"],
  },
  {
    id: "blueberry-muffin",
    dessert: "blueberry muffin",
    bubbleSrc: "/foods/blueberry-muffin-bubble.png",
    ingredients: ["muffin batter", "blueberries", "sugar"],
  },
  {
    id: "strawberry-cheesecake",
    dessert: "strawberry cheesecake",
    bubbleSrc: "/foods/strawberry-cheesecake-bubble.png",
    ingredients: ["cream cheese", "strawberries", "graham crust"],
  },
];

const roundLengthSeconds = 30;
const customerPhaseSeconds = 5;
const customerSprites: Record<CustomerPhase, string> = {
  neutral: "/customers/cat-neutral.png",
  waiting: "/customers/cat-waiting.png",
  mad: "/customers/cat-mad.png",
};
const scoreByCustomerPhase: Record<CustomerPhase, number> = {
  neutral: 100,
  waiting: 50,
  mad: 10,
};
const customerNames = [
  "Mochi",
  "Biscuit",
  "Pepper",
  "Maple",
  "Clover",
  "Fig",
  "Juniper",
  "Nori",
];

const normalize = (value: string) => value.toLowerCase().trim();
const randomCustomerName = () =>
  customerNames[Math.floor(Math.random() * customerNames.length)] ?? "Mochi";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("title");
  const [orderIndex, setOrderIndex] = useState(0);
  const [entry, setEntry] = useState("");
  const [enteredIngredients, setEnteredIngredients] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundLengthSeconds);
  const [customerPhase, setCustomerPhase] = useState<CustomerPhase>("neutral");
  const [customerName, setCustomerName] = useState(randomCustomerName);
  const [customerAnimationKey, setCustomerAnimationKey] = useState(0);
  const [message, setMessage] = useState("Type one ingredient, then press Enter.");
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [titleOverlay, setTitleOverlay] = useState<TitleOverlay>(null);
  const leaderboard = api.leaderboard.top.useQuery(undefined, {
    enabled: timeLeft === 0 || titleOverlay === "leaderboard",
  });
  const saveScore = api.leaderboard.create.useMutation({
    onSuccess: async () => {
      setSavedScore(score);
      await leaderboard.refetch();
    },
  });

  const order = recipes[orderIndex] ?? recipes[0]!;
  const completed = order.ingredients.filter((ingredient) =>
    enteredIngredients.includes(ingredient),
  );
  const isOrderComplete = completed.length === order.ingredients.length;
  const isRoundOver = timeLeft === 0;
  const timerPercent = (timeLeft / roundLengthSeconds) * 100;
  const customerImage = customerSprites[customerPhase];

  const resetRound = () => {
    setOrderIndex(0);
    setEntry("");
    setEnteredIngredients([]);
    setScore(0);
    setCompletedOrders(0);
    setTimeLeft(roundLengthSeconds);
    setCustomerPhase("neutral");
    setCustomerName(randomCustomerName());
    setCustomerAnimationKey((current) => current + 1);
    setMessage("Type one ingredient, then press Enter.");
  };

  const advanceCustomer = (nextMessage: string) => {
    setMessage(nextMessage);
    setOrderIndex((current) => (current + 1) % recipes.length);
    setCustomerName(randomCustomerName());
    setCustomerAnimationKey((current) => current + 1);
    setCustomerPhase("neutral");
    setEnteredIngredients([]);
    setEntry("");
  };

  useEffect(() => {
    setCustomerPhase("neutral");
  }, [order.id]);

  useEffect(() => {
    if (isRoundOver || screen !== "playing") return;

    const phaseTimer = window.setTimeout(() => {
      setCustomerPhase((current) => {
        if (current === "neutral") return "waiting";
        if (current === "waiting") return "mad";

        setScore((scoreCurrent) => Math.max(0, scoreCurrent - 20));
        advanceCustomer(`${customerName} left mad. -20`);
        return "mad";
      });
    }, customerPhaseSeconds * 1000);

    return () => window.clearTimeout(phaseTimer);
  }, [customerName, customerPhase, isRoundOver, order.id, screen]);

  useEffect(() => {
    if (screen !== "playing" || isRoundOver) return;

    const roundTimer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(roundTimer);
  }, [isRoundOver, screen]);

  const finishOrder = () => {
    if (isRoundOver) return;

    const points = scoreByCustomerPhase[customerPhase];

    setScore((current) => current + points);
    setCompletedOrders((current) => current + 1);
    advanceCustomer(`${customerName} loved the ${order.dessert}. +${points}`);
  };

  const submitIngredient = () => {
    if (isRoundOver) return;

    const ingredient = normalize(entry);

    if (!ingredient) return;

    if (!order.ingredients.includes(ingredient)) {
      setScore((current) => Math.max(0, current - 5));
      setMessage(`"${entry}" is not in this recipe.`);
      setEntry("");
      return;
    }

    if (enteredIngredients.includes(ingredient)) {
      setMessage(`You already added ${ingredient}.`);
      setEntry("");
      return;
    }

    const nextEnteredIngredients = [...enteredIngredients, ingredient];
    setEnteredIngredients(nextEnteredIngredients);
    setEntry("");

    if (nextEnteredIngredients.length === order.ingredients.length) {
      finishOrder();
      return;
    }

    setMessage(`${ingredient} added. Keep going.`);
  };

  const startGame = () => {
    resetRound();
    setSavedScore(null);
    setPlayerName("");
    setTitleOverlay(null);
    setScreen("playing");
  };

  const playAgain = () => {
    resetRound();
    setSavedScore(null);
    setPlayerName("");
  };

  const returnToTitle = () => {
    setScreen("title");
  };

  const submitLeaderboardScore = () => {
    const name = playerName.trim();

    if (!name || savedScore === score || saveScore.isPending) return;

    saveScore.mutate({ name, score });
  };

  if (screen === "title") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#8add61] px-6 text-zinc-950">
        <div className="absolute right-6 top-6 flex gap-3">
          <button
            type="button"
            aria-label="Open leaderboard"
            onClick={() => setTitleOverlay("leaderboard")}
            className="grid size-14 place-items-center rounded-full border-4 border-zinc-900 bg-white text-2xl font-black shadow-[0_5px_0_#3f2a1a] transition hover:-translate-y-1 hover:shadow-[0_8px_0_#3f2a1a] active:translate-y-1 active:shadow-[0_2px_0_#3f2a1a]"
          >
            ★
          </button>
          <button
            type="button"
            aria-label="Open instructions"
            onClick={() => setTitleOverlay("instructions")}
            className="grid size-14 place-items-center rounded-full border-4 border-zinc-900 bg-white text-2xl font-black shadow-[0_5px_0_#3f2a1a] transition hover:-translate-y-1 hover:shadow-[0_8px_0_#3f2a1a] active:translate-y-1 active:shadow-[0_2px_0_#3f2a1a]"
          >
            ?
          </button>
        </div>
        <section className="flex w-full max-w-sm flex-col items-center gap-6">
          <div className="relative size-64 sm:size-80">
            <Image
              src="/title/titlecard.png"
              alt="Sweet Keys"
              fill
              priority
              className="object-contain [image-rendering:pixelated]"
              sizes="320px"
            />
          </div>
          <button
            type="button"
            onClick={startGame}
            className="border-4 border-zinc-900 bg-white px-10 py-4 text-2xl font-black uppercase tracking-widest shadow-[0_6px_0_#3f2a1a] transition hover:-translate-y-1 hover:shadow-[0_10px_0_#3f2a1a] active:translate-y-1 active:shadow-[0_3px_0_#3f2a1a]"
          >
            Play
          </button>
        </section>

        {titleOverlay ? (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-zinc-950/40 px-6">
            <section
              className={`w-full border-4 border-zinc-900 bg-white p-5 shadow-[0_8px_0_#3f2a1a] ${
                titleOverlay === "instructions"
                  ? "max-h-[86vh] max-w-3xl overflow-y-auto"
                  : "max-w-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-black uppercase tracking-widest">
                  {titleOverlay === "leaderboard"
                    ? "Leaderboard"
                    : "Instructions"}
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setTitleOverlay(null)}
                  className="grid size-9 place-items-center border-2 border-zinc-900 font-black"
                >
                  ×
                </button>
              </div>

              {titleOverlay === "leaderboard" ? (
                <ol className="mt-4 grid gap-2">
                  {leaderboard.data && leaderboard.data.length > 0 ? (
                    leaderboard.data.map((leaderboardScore, index) => (
                      <li
                        key={leaderboardScore.id}
                        className="grid grid-cols-[2rem_1fr_auto] gap-3 border-2 border-zinc-900 bg-zinc-100 px-3 py-2 font-black"
                      >
                        <span>{index + 1}</span>
                        <span className="truncate">{leaderboardScore.name}</span>
                        <span>{leaderboardScore.value}</span>
                      </li>
                    ))
                  ) : leaderboard.isLoading ? (
                    <li className="border-2 border-dashed border-zinc-400 px-3 py-2 text-center text-sm font-bold text-zinc-500">
                      Loading scores...
                    </li>
                  ) : (
                    <li className="border-2 border-dashed border-zinc-400 px-3 py-2 text-center text-sm font-bold text-zinc-500">
                      No scores yet
                    </li>
                  )}
                </ol>
              ) : (
                <div className="mt-4 grid gap-5 text-sm font-bold text-zinc-700">
                  <p>
                    Customers come in with a baked-good order. Type the
                    ingredients one at a time to make what they asked for. Work
                    quickly: customers get impatient, then mad, and will
                    eventually leave.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        label: "Neutral",
                        src: "/instructions/customer-neutral.png",
                      },
                      {
                        label: "Waiting",
                        src: "/instructions/customer-waiting.png",
                      },
                      {
                        label: "Mad",
                        src: "/instructions/customer-mad.png",
                      },
                    ].map((item) => (
                      <figure key={item.label} className="grid gap-2">
                        <Image
                          src={item.src}
                          alt={`${item.label} customer state`}
                          width={640}
                          height={360}
                          className="aspect-video w-full border-2 border-zinc-900 object-cover [image-rendering:pixelated]"
                        />
                        <figcaption className="text-center text-xs font-black uppercase tracking-widest text-zinc-500">
                          {item.label}
                        </figcaption>
                      </figure>
                    ))}
                  </div>

                  <div className="grid gap-4">
                    <figure className="grid gap-2">
                      <Image
                        src="/instructions/type-ingredient.gif"
                        alt="Typing an ingredient"
                        width={640}
                        height={360}
                        unoptimized
                        className="w-full border-2 border-zinc-900 object-contain [image-rendering:pixelated]"
                      />
                      <figcaption className="text-center text-xs font-black uppercase tracking-widest text-zinc-500">
                        Type each ingredient, then press Enter
                      </figcaption>
                    </figure>
                    <figure className="grid gap-2">
                      <Image
                        src="/instructions/correct-ingredient.gif"
                        alt="Correct ingredients turning green"
                        width={640}
                        height={360}
                        unoptimized
                        className="w-full border-2 border-zinc-900 object-contain [image-rendering:pixelated]"
                      />
                      <figcaption className="text-center text-xs font-black uppercase tracking-widest text-zinc-500">
                        Correct ingredients turn green
                      </figcaption>
                    </figure>
                  </div>

                  <p>
                    Typing the wrong ingredient removes points from your score.
                  </p>

                  <div className="border-2 border-zinc-900 bg-zinc-100 p-3">
                    <p className="text-sm font-black uppercase tracking-widest text-zinc-500">
                      Scoring
                    </p>
                    <div className="mt-3 grid gap-2">
                      <div className="flex justify-between">
                        <span>Neutral customer</span>
                        <span>+100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Waiting customer</span>
                        <span>+50</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mad customer</span>
                        <span>+10</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer leaves mad</span>
                        <span>-20</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Wrong ingredient</span>
                        <span>-5</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>
    );
  }

  if (isRoundOver) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#8add61] px-6 py-8 text-zinc-950">
        <section className="flex w-full max-w-md flex-col items-center gap-5">
          <div className="relative size-56 sm:size-64">
            <Image
              src="/title/endcard.png"
              alt="Game over"
              fill
              priority
              className="object-contain [image-rendering:pixelated]"
              sizes="256px"
            />
          </div>

          <div className="w-full border-4 border-zinc-900 bg-white p-4 text-center shadow-[0_8px_0_#3f2a1a]">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
              Final score
            </p>
            <p className="text-6xl font-black leading-none">{score}</p>
            <div className="mt-3 flex justify-center gap-4 text-sm font-black text-zinc-600">
              <span>{completedOrders} orders</span>
              <span>{completedOrders * order.ingredients.length} ingredients</span>
            </div>
          </div>

          <div className="w-full border-4 border-zinc-900 bg-white p-4 shadow-[0_8px_0_#3f2a1a]">
            <p className="text-center text-sm font-black uppercase tracking-widest text-zinc-500">
              Leaderboard
            </p>
            <ol className="mt-3 grid gap-2">
              {leaderboard.data && leaderboard.data.length > 0 ? (
                leaderboard.data.map((leaderboardScore, index) => (
                  <li
                    key={leaderboardScore.id}
                    className={`flex justify-between border-2 border-zinc-900 px-3 py-2 font-black ${
                      leaderboardScore.value === score
                        ? "bg-emerald-200"
                        : "bg-zinc-100"
                    }`}
                    >
                      <span>{index + 1}</span>
                      <span className="truncate px-3">{leaderboardScore.name}</span>
                      <span>{leaderboardScore.value}</span>
                    </li>
                  ))
              ) : leaderboard.isLoading || saveScore.isPending ? (
                <li className="border-2 border-dashed border-zinc-400 px-3 py-2 text-center text-sm font-bold text-zinc-500">
                  Loading scores...
                </li>
              ) : (
                <li className="border-2 border-dashed border-zinc-400 px-3 py-2 text-center text-sm font-bold text-zinc-500">
                  No scores yet
                </li>
              )}
            </ol>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={playAgain}
              className="border-4 border-zinc-900 bg-white px-5 py-3 text-lg font-black uppercase tracking-widest shadow-[0_6px_0_#3f2a1a] transition hover:-translate-y-1 hover:shadow-[0_10px_0_#3f2a1a] active:translate-y-1 active:shadow-[0_3px_0_#3f2a1a]"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={returnToTitle}
              className="border-4 border-zinc-900 bg-white px-5 py-3 text-lg font-black uppercase tracking-widest shadow-[0_6px_0_#3f2a1a] transition hover:-translate-y-1 hover:shadow-[0_10px_0_#3f2a1a] active:translate-y-1 active:shadow-[0_3px_0_#3f2a1a]"
            >
              Main screen
            </button>
          </div>

          {savedScore !== score ? (
            <div className="fixed inset-0 z-10 flex items-center justify-center bg-zinc-950/40 px-6">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitLeaderboardScore();
                }}
                className="w-full max-w-sm border-4 border-zinc-900 bg-white p-5 text-center shadow-[0_8px_0_#3f2a1a]"
              >
                <p className="text-sm font-black uppercase tracking-widest text-zinc-500">
                  Leaderboard name
                </p>
                <p className="mt-2 text-4xl font-black">{score}</p>
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  maxLength={12}
                  autoFocus
                  placeholder="Your name"
                  className="mt-5 w-full border-2 border-zinc-900 px-4 py-3 text-center text-xl font-black outline-none"
                />
                <button
                  type="submit"
                  disabled={!playerName.trim() || saveScore.isPending}
                  className="mt-4 w-full border-2 border-zinc-900 bg-zinc-950 px-5 py-3 font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {saveScore.isPending ? "Saving..." : "Save score"}
                </button>
                {saveScore.error ? (
                  <p className="mt-3 text-sm font-bold text-red-600">
                    Could not save score: {saveScore.error.message}
                  </p>
                ) : null}
              </form>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#8add61] px-4 py-6 text-zinc-950">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col justify-center gap-5">
        <section className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-zinc-900 bg-[#8add61] shadow-[0_8px_0_#3f2a1a]">
          <Image
            src="/backgrounds/bakery-bg.png"
            alt="Pixel bakery counter"
            fill
            priority
            className="object-cover [image-rendering:pixelated]"
            sizes="(min-width: 1024px) 1024px, 100vw"
          />

          <div className="absolute left-[47%] top-[33%] h-[34%] w-[20%] -translate-x-1/2">
            <div
              key={customerAnimationKey}
              className="relative h-full w-full animate-[customer-slide-in_420ms_steps(6,end)]"
            >
              <Image
                src={customerImage}
                alt={`${customerName}, a bakery customer`}
                fill
                priority
                className="object-contain [image-rendering:pixelated]"
                sizes="240px"
              />
            </div>
          </div>

          <div className="absolute left-[43%] top-[16%] size-[34%]">
            <Image
              src={order.bubbleSrc}
              alt={`${order.dessert} order bubble`}
              fill
              className="object-contain [image-rendering:pixelated]"
              sizes="220px"
            />
          </div>

          <div className="absolute left-4 top-4 rounded border-2 border-zinc-900 bg-white/90 px-3 py-2 shadow-[3px_3px_0_#2f2017]">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              {customerPhase}
            </p>
            <p className="text-xl font-black">{customerName}</p>
          </div>

          <div className="absolute right-4 top-4 w-40 rounded border-2 border-zinc-900 bg-white/90 px-3 py-2 shadow-[3px_3px_0_#2f2017]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
                Time
              </p>
              <p className="font-black">{timeLeft}s</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border-4 border-zinc-900 bg-white p-4 shadow-[0_8px_0_#3f2a1a]">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Making
              </p>
              <h1 className="text-base font-black tracking-normal text-zinc-600">
                {order.dessert}
              </h1>
            </div>
            <p className="text-sm font-bold text-zinc-700">Score: {score}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {order.ingredients.map((ingredient) => {
              const isComplete = completed.includes(ingredient);

              return (
                <div
                  key={ingredient}
                  className={`border-2 px-3 py-3 text-center text-lg font-black ${
                    isComplete
                      ? "border-emerald-700 bg-emerald-200 text-emerald-950"
                      : "border-zinc-900 bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {ingredient}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={entry}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitIngredient();
                }
              }}
              placeholder="cookie dough"
              className="min-w-0 flex-1 border-2 border-zinc-900 px-4 py-3 text-lg font-semibold outline-none"
            />
            <button
              type="button"
              onClick={isOrderComplete ? finishOrder : submitIngredient}
              className="border-2 border-zinc-900 bg-zinc-950 px-5 py-3 font-black text-white transition hover:bg-zinc-800"
            >
              Enter
            </button>
          </div>

          <p className="min-h-5 text-sm font-semibold text-zinc-600">
            {message}
          </p>
        </section>
      </div>
    </main>
  );
}
