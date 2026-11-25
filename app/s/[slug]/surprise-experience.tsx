"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { readExperience, type PageKey } from "../../../lib/supabase";

type Props = {
  surprise: {
    title: string;
    recipient_name: string;
    sender_name: string;
    occasion_date: string | null;
    letter: string;
    wishes: string[];
    theme: string;
    experience: unknown;
    published: boolean;
  };
};

type Countdown = { days: number; hours: number; minutes: number; seconds: number } | null;

const pageNames: Record<PageKey, string> = {
  welcome: "Welcome",
  song: "Our song",
  wishes: "Wishes",
  candles: "Make a wish",
  memory: "Memories",
  final: "Your greeting",
};

async function getAssetUrl(path: string) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`/api/assets/${encodedPath}`);
  const data = await response.json() as { url?: string; error?: string };
  if (!response.ok || !data.url) throw new Error(data.error || "This surprise asset could not be loaded.");
  return data.url;
}

function getCountdown(date: string): Countdown {
  const target = new Date(`${date}T00:00:00`).getTime();
  const difference = target - Date.now();
  if (difference <= 0) return null;
  const seconds = Math.floor(difference / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

function BirthdayCake({ candles = 5, unlit = 0 }: { candles?: number; unlit?: number }) {
  return <div className={`cakeIllustration ${unlit === candles ? "cakeComplete" : ""}`} aria-label="A decorated birthday cake">
    <div className="cakeCandles">{Array.from({ length: candles }, (_, index) => <span className={`cakeCandle ${index < unlit ? "unlit" : ""}`} key={index}><i/></span>)}</div>
    <div className="cakeTop"><span className="cakeCherry">♥</span><span className="cakeSprinkles">· · · · · · ·</span></div>
    <div className="cakeLayer cakeLayerTop"><i/><i/><i/><i/><i/></div>
    <div className="cakeLayer cakeLayerBottom"><i/><i/><i/><i/><i/><i/><i/></div>
    <div className="cakePlate"/>
  </div>;
}

export default function SurpriseExperience({ surprise: s }: Props) {
  const experience = useMemo(() => readExperience(s.experience), [s.experience]);
  const wishList = Array.isArray(s.wishes) ? s.wishes.filter((wish) => typeof wish === "string" && wish.trim()) : [];
  const pageAvailability: Record<PageKey, boolean> = {
    welcome: true,
    song: experience.enabled.song && Boolean(experience.songPath),
    wishes: experience.enabled.wishes && wishList.length > 0,
    candles: experience.enabled.candles,
    memory: experience.enabled.memory && experience.memories.length > 0,
    final: true,
  };
  const pages = experience.pageOrder.filter((page) => pageAvailability[page]);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState<Countdown>(null);
  const [countdownReady, setCountdownReady] = useState(false);
  const [wishIndex, setWishIndex] = useState(0);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [assetError, setAssetError] = useState("");
  const [songTime, setSongTime] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const [songPlaying, setSongPlaying] = useState(false);
  const [litCandles, setLitCandles] = useState(5);
  const [micListening, setMicListening] = useState(false);
  const [micMessage, setMicMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const litCandlesRef = useRef(5);

  const theme = s.theme === "lavender" ? "lavender" : s.theme === "peach" ? "peach" : s.theme === "midnight" ? "midnight" : "rose";
  const currentPage = pages[Math.min(currentIndex, pages.length - 1)] || "welcome";
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const isBirthday = !s.occasion_date || (countdownReady && !countdown);

  useEffect(() => {
    if (!s.occasion_date) return;
    const updateCountdown = () => {
      setCountdown(getCountdown(s.occasion_date!));
      setCountdownReady(true);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [s.occasion_date]);

  useEffect(() => {
    let active = true;
    const paths = [experience.songPath, ...experience.memories.map((photo) => photo.path)].filter(Boolean);
    void Promise.all(paths.map(async (path) => [path, await getAssetUrl(path)] as const))
      .then((entries) => {
        if (active) setAssetUrls(Object.fromEntries(entries));
      })
      .catch((error: unknown) => {
        if (active) setAssetError(error instanceof Error ? error.message : "A surprise photo or song could not be loaded.");
      });
    return () => { active = false; };
  }, [experience]);

  useEffect(() => {
    if (currentPage !== "song" && audioRef.current && !audioRef.current.paused) audioRef.current.pause();
  }, [currentPage]);

  function stopMic() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
    audioContextRef.current = null;
    setMicListening(false);
  }

  function extinguishOneCandle() {
    if (litCandlesRef.current <= 0) return;
    const remaining = litCandlesRef.current - 1;
    litCandlesRef.current = remaining;
    setLitCandles(remaining);
    if (remaining === 0) stopMic();
  }

  function stopHolding() {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    holdTimerRef.current = null;
  }

  function startHolding() {
    if (litCandlesRef.current === 0 || holdTimerRef.current) return;
    setMicMessage("");
    holdTimerRef.current = setInterval(extinguishOneCandle, 650);
  }

  async function listenToBlow() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicMessage("Microphone access is not available here. Press and hold the button to blow out the candles.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (currentPageRef.current !== "candles") {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const context = new AudioContext();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      sourceRef.current = context.createMediaStreamSource(stream);
      sourceRef.current.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let loudFrames = 0;
      let lastBlow = 0;
      setMicListening(true);
      setMicMessage("Listening locally for a puff of air. No audio is recorded or uploaded.");

      const detectSound = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + (sample - 128) ** 2, 0) / samples.length) / 128;
        loudFrames = rms > 0.13 ? loudFrames + 1 : 0;
        const now = performance.now();
        if (loudFrames > 5 && now - lastBlow > 900) {
          lastBlow = now;
          loudFrames = 0;
          extinguishOneCandle();
        }
        rafRef.current = requestAnimationFrame(detectSound);
      };
      rafRef.current = requestAnimationFrame(detectSound);
    } catch (error) {
      stopMic();
      setMicMessage("Microphone permission was denied or unavailable. You can still press and hold the button to blow out the candles.");
    }
  }

  useEffect(() => {
    if (!started || currentPage !== "candles") return;
    const keyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        startHolding();
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") stopHolding();
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      stopHolding();
    };
  }, [started, currentPage]);

  useEffect(() => () => {
    stopHolding();
    stopMic();
  }, []);

  function previousPage() {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function nextPage() {
    setCurrentIndex((index) => Math.min(pages.length - 1, index + 1));
  }

  async function toggleSong() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setAssetError("Playback could not start. Tap play again or check your device audio settings.");
      }
    } else {
      audio.pause();
    }
  }

  function watchAgain() {
    stopMic();
    stopHolding();
    litCandlesRef.current = 5;
    setLitCandles(5);
    setStarted(false);
    setCurrentIndex(0);
  }

  return <main className={`birthdayJourney ${theme}`}>
    <div className="floatingConfetti" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
    <header className="journeyHeader">
      <Link href="/" className="journeyBrand" aria-label="WishBloom home">💗</Link>
      <span className="journeyKicker">{s.title}</span>
      {started && <span className="journeyCounter">{currentIndex + 1} / {pages.length}</span>}
    </header>
    {!started ? <section className="journeyPage welcomePage">
      <div className="welcomeCopy">
        <span className="eyebrow">{isBirthday ? "Make a wish" : "The big day is almost here"}</span>
        <span className="birthdayDate">🎂 {s.occasion_date ? new Date(`${s.occasion_date}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric" }) : "A day made for you"}</span>
        <h1 className="serif">{isBirthday ? "Happy birthday," : "A little surprise for"}<br/><em>{s.recipient_name}!</em></h1>
        <p>{s.title}</p>
        {countdown ? <div className="countdownBlock"><span className="eyebrow">Counting down</span><div className="countdownGrid">
          {([["days", countdown.days], ["hours", countdown.hours], ["min", countdown.minutes], ["sec", countdown.seconds]] as const).map(([label, amount]) => <div key={label}><strong>{String(amount).padStart(2, "0")}</strong><span>{label}</span></div>)}
        </div></div> : <p className="celebrationState">Today is all about you. Your surprise is ready ✨</p>}
      </div>
      <div className="welcomeArtwork"><BirthdayCake/><span className="cakeStand">✦ ✧ ✦</span></div>
      <button className="primary journeyPrimary" onClick={() => { setCurrentIndex(1); setStarted(true); }}>🎁 Open my gift</button>
    </section> : <section className={`journeyPage storyPage story-${currentPage}`} key={currentPage}>
      {currentPage === "welcome" && <>
        <span className="eyebrow">A birthday wish, just for you</span>
        <div className="storyArtwork"><BirthdayCake/></div>
        <h1 className="serif">Let the magic begin,<br/><em>{s.recipient_name}!</em></h1>
        <p>Every little part of this surprise was made with love.</p>
        <button className="primary journeyPrimary" onClick={nextPage}>Begin the surprise →</button>
      </>}

      {currentPage === "song" && <div className="songPageContent">
        <span className="eyebrow">A little melody for you</span>
        <div className="turntable"><div className={`record ${songPlaying ? "recordPlaying" : ""}`}><span>♥</span></div><div className="tonearm"/></div>
        <div className="songInfo"><h1 className="serif">{experience.songTitle || "Our song"}</h1><p>{experience.songDedication || `A song for ${s.recipient_name}, with love.`}</p>
          <audio ref={audioRef} src={assetUrls[experience.songPath]} preload="metadata" onTimeUpdate={(event) => setSongTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setSongDuration(event.currentTarget.duration || 0)} onPlay={() => setSongPlaying(true)} onPause={() => setSongPlaying(false)} onEnded={() => setSongPlaying(false)}/>
          <div className="audioControls"><button className="primary" onClick={toggleSong} disabled={!assetUrls[experience.songPath]}>{songPlaying ? "Ⅱ Pause" : "▶ Play song"}</button><input aria-label="Song progress" type="range" min="0" max={songDuration || 0} step="0.1" value={Math.min(songTime, songDuration || 0)} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value); }} disabled={!songDuration}/><div className="audioTimes"><span>{Math.floor(songTime / 60)}:{String(Math.floor(songTime % 60)).padStart(2, "0")}</span><span>{Math.floor(songDuration / 60)}:{String(Math.floor(songDuration % 60)).padStart(2, "0")}</span></div></div>
        </div>
      </div>}

      {currentPage === "wishes" && <div className="wishesPageContent">
        <span className="eyebrow">Wishes · dreams</span><h1 className="serif">Wishes for<br/><em>your new year</em></h1>
        <p>One wish per line: they rise out of the jar like little stars.</p>
        <div className="wishJar"><div className="jarCork"/><div className="jarStars"><span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span></div><div className="jarBow">🎀</div></div>
        <article className="glowingWish" key={wishIndex}><span>Wish {wishIndex + 1} of {wishList.length}</span><p>✨ {wishList[wishIndex]}</p></article>
        <div className="storyActions"><button className="secondary" disabled={wishIndex === 0} onClick={() => setWishIndex((index) => index - 1)}>← Previous</button><button className="primary" disabled={wishIndex === wishList.length - 1} onClick={() => setWishIndex((index) => index + 1)}>Next wish →</button></div>
      </div>}

      {currentPage === "candles" && <div className="candlesPageContent">
        <div className="candleArtwork"><BirthdayCake candles={5} unlit={5 - litCandles}/></div>
        <article className="candleCard">
          <span className="eyebrow">Make a wish</span>
          <h1 className="serif">{litCandles === 0 ? "Wish made!" : "Blow out the candles"}</h1>
          <p>{litCandles === 0 ? `May this year bring you every good thing, ${s.recipient_name}.` : "Close your eyes, make a wish and blow into the microphone, or press and hold the button below."}</p>
          {litCandles > 0 ? <>
            <button className="primary micButton" onClick={() => micListening ? stopMic() : listenToBlow()}>{micListening ? "Stop listening" : "🎙 Blow into the microphone"}</button>
            <button className="secondary holdButton" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); startHolding(); }} onPointerUp={stopHolding} onPointerCancel={stopHolding} onLostPointerCapture={stopHolding}>〰 Press and hold to blow</button>
            <small>Microphone input is processed here on your device only. Nothing is recorded.</small>
            {micMessage && <p className="micMessage" role="status">{micMessage}</p>}
          </> : <div className="candleCelebration"><span>🎉 ✨ 🎊</span><p>Happy birthday, {s.recipient_name}!</p></div>}
          <p className="candleCount">{litCandles} candle{litCandles === 1 ? "" : "s"} still glowing</p>
          {litCandles === 0 && <button className="primary journeyPrimary" onClick={nextPage}>Continue your surprise →</button>}
        </article>
      </div>}

      {currentPage === "memory" && <div className="memoryPageContent">
        <span className="eyebrow">A moment to keep</span><h1 className="serif">{experience.memoryTitle || "Our favorite memories"}</h1>
        <div className="memoryFrame">{assetUrls[experience.memories[memoryIndex]?.path] ? <img src={assetUrls[experience.memories[memoryIndex].path]} alt={experience.memories[memoryIndex].caption || `Memory ${memoryIndex + 1}`}/> : <div className="assetLoading">Loading your memory…</div>}</div>
        <p className="memoryCaption">{experience.memories[memoryIndex]?.caption || "A moment I will always cherish."}</p>
        <div className="storyActions"><button className="secondary" disabled={memoryIndex === 0} onClick={() => setMemoryIndex((index) => index - 1)}>← Previous memory</button><span>{memoryIndex + 1} / {experience.memories.length}</span><button className="primary" disabled={memoryIndex === experience.memories.length - 1} onClick={() => setMemoryIndex((index) => index + 1)}>Next memory →</button></div>
      </div>}

      {currentPage === "final" && <div className="finalPageContent">
        <div className="finalCake"><BirthdayCake/></div>
        <div className="finalGreeting"><span className="eyebrow">Make a wish</span><h1 className="serif">Happy birthday,<br/><em>{s.recipient_name}!</em></h1>
          {s.letter && <p className="finalLetter">{s.letter}</p>}
          <p className="finalSign">With all my love,<br/>{s.sender_name}</p>
          <div className="finalActions"><button className="secondary" onClick={watchAgain}>↶ Watch again</button><Link className="secondary" href="/">Back to home</Link></div>
        </div>
      </div>}
    </section>}

    {started && currentPage !== "welcome" && <JourneyNav currentIndex={currentIndex} total={pages.length} previous={previousPage} next={nextPage} nextDisabled={currentPage === "candles" && litCandles > 0}/>}
    {assetError && <p className="assetError" role="status">{assetError}</p>}
    {!started && <footer>Made with love on WishBloom 💗</footer>}
  </main>;
}

function JourneyNav({ currentIndex, total, previous, next, nextDisabled = false }: {
  currentIndex: number;
  total: number;
  previous: () => void;
  next: () => void;
  nextDisabled?: boolean;
}) {
  return <nav className="journeyNav" aria-label="Surprise page navigation">
    <button className="secondary" onClick={previous} disabled={currentIndex === 0}>←</button>
    <div className="journeyDots"><span>{currentIndex + 1} / {total}</span></div>
    <button className="primary" onClick={next} disabled={currentIndex >= total - 1 || nextDisabled}>→</button>
  </nav>;
}
