"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import {
  defaultExperience,
  readExperience,
  supabase,
  type MemoryPhoto,
  type PageKey,
  type Surprise,
  type SurpriseExperience,
} from "../lib/supabase";

type PhotoDraft = MemoryPhoto & { file: File | null; preview: string };
type FormState = Omit<Surprise, "id" | "owner_id" | "slug" | "published" | "created_at" | "occasion_date"> & {
  occasion_date: string;
};

const pageLabels: Record<PageKey, string> = {
  welcome: "Birthday welcome",
  song: "Dedicated song",
  wishes: "Wishes",
  candles: "Blow out candles",
  memory: "Memory photos",
  final: "Final greeting",
};
const optionalPages: Exclude<PageKey, "welcome" | "final">[] = ["song", "wishes", "candles", "memory"];
const audioTypes: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
};
const imageTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function blankForm(): FormState {
  return {
    title: "A little surprise for you",
    recipient_name: "",
    sender_name: "",
    occasion_date: "",
    letter: "",
    wishes: ["", "", ""],
    theme: "rose",
    experience: { ...defaultExperience, enabled: { ...defaultExperience.enabled }, pageOrder: [...defaultExperience.pageOrder] },
  };
}

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

function mediaType(file: File, types: Record<string, string>) {
  const expected = types[fileExtension(file)];
  const alternateWavType = expected === "audio/wav" && file.type === "audio/x-wav";
  return expected && (!file.type || file.type === expected || alternateWavType) ? expected : null;
}

function uniquePath(file: File, ownerId: string, surpriseId: string, kind: "song" | "memory") {
  return `${ownerId}/${surpriseId}/${kind}/${crypto.randomUUID()}.${fileExtension(file)}`;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [form, setForm] = useState<FormState>(blankForm);
  const [items, setItems] = useState<Surprise[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [songFile, setSongFile] = useState<File | null>(null);
  const [songPreview, setSongPreview] = useState("");
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const originalPaths = useRef<string[]>([]);
  const blobUrls = useRef<string[]>([]);

  useEffect(() => {
    return () => blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(currentSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadItems() {
    if (!supabase || !session?.user) return;
    const { data, error } = await supabase
      .from("surprises")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setItems((data || []).map((item) => ({ ...item, experience: readExperience(item.experience) })) as Surprise[]);
  }

  useEffect(() => {
    void loadItems();
  }, [session]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateExperience<K extends keyof SurpriseExperience>(key: K, value: SurpriseExperience[K]) {
    setForm((current) => ({
      ...current,
      experience: { ...current.experience, [key]: value },
    }));
  }

  function resetForm() {
    setForm(blankForm());
    setEditing(null);
    setEditingSlug(null);
    setSongFile(null);
    setSongPreview("");
    setPhotos([]);
    originalPaths.current = [];
    setMessage("");
  }

  async function auth() {
    if (!supabase) {
      setMessage("Set your Supabase URL and publishable key in .env.local first.");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (authMode === "signup" && !result.data.session) setMessage("Account created. Check your email to confirm, then log in.");
    else setMessage("Welcome to WishBloom!");
  }

  function chooseSong(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!mediaType(file, audioTypes) || file.size > 12 * 1024 * 1024) {
      setMessage("Choose an MP3, M4A, WAV, OGG, or WebM audio file up to 12 MB.");
      event.target.value = "";
      return;
    }
    const preview = URL.createObjectURL(file);
    blobUrls.current.push(preview);
    setSongFile(file);
    setSongPreview(preview);
    updateExperience("enabled", { ...form.experience.enabled, song: true });
    event.target.value = "";
    setMessage("");
  }

  function addMemoryPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!mediaType(file, imageTypes) || file.size > 8 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, or WebP photo up to 8 MB.");
      event.target.value = "";
      return;
    }
    if (photos.length >= 8) {
      setMessage("You can add up to 8 memory photos.");
      event.target.value = "";
      return;
    }
    const preview = URL.createObjectURL(file);
    blobUrls.current.push(preview);
    setPhotos((current) => [...current, { path: "", caption: "", file, preview }]);
    updateExperience("enabled", { ...form.experience.enabled, memory: true });
    event.target.value = "";
    setMessage("");
  }

  async function save(publish: boolean) {
    if (!supabase || !session?.user) return;
    if (!form.recipient_name.trim()) {
      setMessage("Add the recipient's name first.");
      return;
    }
    const currentSongPath = form.experience.songPath;
    if (form.experience.enabled.song && !songFile && !currentSongPath) {
      setMessage("Add a song file or turn off the song page.");
      return;
    }
    const availablePhotos = photos.filter((photo) => photo.file || photo.path);
    if (form.experience.enabled.memory && availablePhotos.length === 0) {
      setMessage("Add at least one memory photo or turn off the memory page.");
      return;
    }

    setBusy(true);
    setMessage("");
    let surpriseId = editing;
    let slug = editingSlug;
    let uploadedPaths: string[] = [];

    if (!surpriseId) {
      slug = `${form.recipient_name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 10)}`;
      const { data, error } = await supabase.from("surprises").insert({
        ...form,
        experience: { ...form.experience, memories: [] },
        recipient_name: form.recipient_name.trim(),
        sender_name: form.sender_name.trim() || "Someone special",
        wishes: form.wishes.map((wish) => wish.trim()).filter(Boolean),
        slug,
        occasion_date: form.occasion_date || null,
        published: false,
        owner_id: session.user.id,
      }).select("id").single();
      if (error || !data) {
        setBusy(false);
        setMessage(error?.message || "Could not create the surprise.");
        return;
      }
      surpriseId = data.id;
      setEditing(surpriseId);
      setEditingSlug(slug);
    }

    if (!surpriseId || !slug) {
      setBusy(false);
      setMessage("The surprise could not be identified for saving.");
      return;
    }

    const nextSongPath = songFile
      ? uniquePath(songFile, session.user.id, surpriseId, "song")
      : currentSongPath;
    if (songFile) {
      const { error } = await supabase.storage.from("surprise-assets").upload(nextSongPath, songFile, {
        contentType: mediaType(songFile, audioTypes) || undefined,
      });
      if (error) {
        setBusy(false);
        setMessage(`Song upload failed: ${error.message}`);
        return;
      }
      uploadedPaths.push(nextSongPath);
    }

    const nextPhotos: MemoryPhoto[] = [];
    for (const photo of availablePhotos) {
      if (!photo.file) {
        nextPhotos.push({ path: photo.path, caption: photo.caption });
        continue;
      }
      const path = uniquePath(photo.file, session.user.id, surpriseId, "memory");
      const { error } = await supabase.storage.from("surprise-assets").upload(path, photo.file, {
        contentType: mediaType(photo.file, imageTypes) || undefined,
      });
      if (error) {
        if (uploadedPaths.length) await supabase.storage.from("surprise-assets").remove(uploadedPaths);
        setBusy(false);
        setMessage(`Memory photo upload failed: ${error.message}`);
        return;
      }
      uploadedPaths.push(path);
      nextPhotos.push({ path, caption: photo.caption });
    }

    const experience = {
      ...form.experience,
      songPath: nextSongPath,
      memories: nextPhotos,
    };
    const payload = {
      ...form,
      experience,
      recipient_name: form.recipient_name.trim(),
      sender_name: form.sender_name.trim() || "Someone special",
      wishes: form.wishes.map((wish) => wish.trim()).filter(Boolean),
      slug,
      occasion_date: form.occasion_date || null,
      published: publish,
      owner_id: session.user.id,
    };
    const result = await supabase.from("surprises").upsert(
      { ...payload, ...(editing ? { id: editing } : { id: surpriseId }) },
      { onConflict: "id" },
    ).select().single();

    if (result.error || !result.data) {
      if (uploadedPaths.length) await supabase.storage.from("surprise-assets").remove(uploadedPaths);
      setBusy(false);
      setMessage(result.error?.message || "Could not save the surprise.");
      return;
    }

    const newPaths = [experience.songPath, ...experience.memories.map((photo) => photo.path)].filter(Boolean);
    const removedPaths = originalPaths.current.filter((path) => !newPaths.includes(path));
    let cleanupMessage = "";
    if (removedPaths.length) {
      const { error } = await supabase.storage.from("surprise-assets").remove(removedPaths);
      if (error) cleanupMessage = ` Saved, but removed media could not be cleaned up: ${error.message}`;
    }
    originalPaths.current = newPaths;
    setForm((current) => ({ ...current, experience }));
    setPhotos(nextPhotos.map((photo, index) => ({
      ...photo,
      file: null,
      preview: availablePhotos[index]?.preview || "",
    })));
    setSongFile(null);
    setEditing(result.data.id);
    setEditingSlug(result.data.slug);
    setBusy(false);
    setMessage(`${publish ? `Published! Share: ${window.location.origin}/s/${result.data.slug}` : "Draft saved."}${cleanupMessage}`);
    await loadItems();
  }

  async function edit(item: Surprise) {
    const experience = readExperience(item.experience);
    setEditing(item.id);
    setEditingSlug(item.slug);
    const songUrl = experience.songPath && supabase
      ? await supabase.storage.from("surprise-assets").createSignedUrl(experience.songPath, 60 * 60)
      : null;
    const photoDrafts = await Promise.all(experience.memories.map(async (photo) => {
      if (!supabase) return { ...photo, file: null, preview: "" };
      const { data, error } = await supabase.storage.from("surprise-assets").createSignedUrl(photo.path, 60 * 60);
      if (error) setMessage(`Could not preview a saved photo: ${error.message}`);
      return { ...photo, file: null, preview: data?.signedUrl || "" };
    }));
    if (songUrl?.error) setMessage(`Could not preview the saved song: ${songUrl.error.message}`);
    setSongFile(null);
    setSongPreview(songUrl?.data?.signedUrl || "");
    setPhotos(photoDrafts);
    originalPaths.current = [experience.songPath, ...experience.memories.map((photo) => photo.path)].filter(Boolean);
    setForm({
      title: item.title,
      recipient_name: item.recipient_name,
      sender_name: item.sender_name,
      occasion_date: item.occasion_date || "",
      letter: item.letter,
      wishes: [...item.wishes, "", ""].slice(0, Math.max(3, item.wishes.length)),
      theme: item.theme,
      experience,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!supabase || !confirm("Delete this surprise permanently?")) return;
    const item = items.find((entry) => entry.id === id);
    if (item) {
      const experience = readExperience(item.experience);
      const paths = [experience.songPath, ...experience.memories.map((photo) => photo.path)].filter(Boolean);
      if (paths.length) {
        const { error: assetError } = await supabase.storage.from("surprise-assets").remove(paths);
        if (assetError) {
          setMessage(`Could not remove the surprise media: ${assetError.message}`);
          return;
        }
      }
    }
    const { error } = await supabase.from("surprises").delete().eq("id", id);
    if (error) setMessage(error.message);
    else {
      setMessage("Surprise deleted.");
      await loadItems();
      if (editing === id) resetForm();
    }
  }

  async function logout() {
    await supabase?.auth.signOut();
    resetForm();
    setItems([]);
  }

  function movePage(page: PageKey, direction: -1 | 1) {
    const order = [...form.experience.pageOrder];
    const index = order.indexOf(page);
    const next = index + direction;
    if (page === "welcome" || page === "final" || next < 0 || next >= order.length) return;
    if (order[next] === "welcome" || order[next] === "final") return;
    [order[index], order[next]] = [order[next], order[index]];
    updateExperience("pageOrder", order);
  }

  function updatePhoto(index: number, patch: Partial<PhotoDraft>) {
    setPhotos((current) => current.map((photo, currentIndex) => currentIndex === index ? { ...photo, ...patch } : photo));
  }

  if (!supabase) return <main className="shell"><header className="brand">💗 WishBloom</header><section className="panel"><span className="eyebrow">Setup needed</span><h1>Connect your database</h1><p>Create a Supabase project, copy <code>.env.example</code> to <code>.env.local</code>, and add your project URL and publishable key. Follow SETUP.md.</p></section></main>;

  return <main className="shell">
    <header className="top"><Link className="brand" href="/">💗 WishBloom</Link><span className="tagline">Make a little surprise. Share a lot of love.</span>{session && <button className="smallBtn" onClick={logout}>Log out</button>}</header>
    <section className="hero panel">
      <span className="eyebrow">A tiny website, a big feeling</span>
      <h1 className="serif">Make someone’s day<br/><em>unforgettable.</em></h1>
      <p>Create a personal birthday journey with a letter, wishes, a song, and little moments of magic — then share one link.</p>
    </section>

    {!session ? <section className="panel auth">
      <h2>{authMode === "signup" ? "Create your free account" : "Welcome back"}</h2>
      <p>Save and manage your surprise pages.</p>
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters"/></label>
      <button className="primary" disabled={busy} onClick={auth}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Log in"}</button>
      <p className="switch">{authMode === "signup" ? "Already have an account?" : "New to WishBloom?"} <button onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "Log in" : "Create account"}</button></p>
      {message && <div className="notice">{message}</div>}
    </section> : <>
      <section className="editor panel">
        <div className="sectionHead"><div><span className="eyebrow">Surprise builder</span><h2>{editing ? "Edit your surprise" : "Create a surprise"}</h2></div><span className="pill">Birthday journey</span></div>
        <div className="formGrid">
          <label>Surprise title<input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="A little surprise for you"/></label>
          <label>Recipient name *<input value={form.recipient_name} onChange={(event) => update("recipient_name", event.target.value)} placeholder="Who is it for?"/></label>
          <label>Your name<input value={form.sender_name} onChange={(event) => update("sender_name", event.target.value)} placeholder="From…"/></label>
          <label>Birthday date<input type="date" value={form.occasion_date} onChange={(event) => update("occasion_date", event.target.value)}/></label>
          <label>Theme<select value={form.theme} onChange={(event) => update("theme", event.target.value)}><option value="rose">Rose pink</option><option value="lavender">Lavender dream</option><option value="peach">Peach glow</option><option value="midnight">Midnight love</option></select></label>
        </div>
        <label>Your letter<textarea rows={7} value={form.letter} onChange={(event) => update("letter", event.target.value)} placeholder="Write your birthday letter here…"/></label>

        <section className="editorFeature">
          <div className="sectionHead"><div><span className="eyebrow">The wish jar</span><h3>Wishes</h3><p>One wish per line — they rise out of the jar like little stars.</p></div></div>
          <label className="featureToggle"><input type="checkbox" checked={form.experience.enabled.wishes} onChange={(event) => updateExperience("enabled", { ...form.experience.enabled, wishes: event.target.checked })}/> Include wishes</label>
          {form.experience.enabled.wishes && <>
            <div className="wishInputs">
              {form.wishes.map((wish, index) => <div className="wishInputRow" key={index}><span>{index + 1}</span><input value={wish} onChange={(event) => update("wishes", form.wishes.map((current, position) => position === index ? event.target.value : current))} placeholder={`One wish for ${form.recipient_name || "this birthday"}…`}/><button type="button" className="smallBtn danger" aria-label={`Remove wish ${index + 1}`} onClick={() => update("wishes", form.wishes.filter((_, position) => position !== index))}>Remove</button></div>)}
              <button type="button" className="smallBtn" onClick={() => update("wishes", [...form.wishes, ""])}>+ Add a wish</button>
            </div>
            <div className="wishPreview"><strong>Preview</strong><p>✨ {form.wishes.find((wish) => wish.trim()) || "Your first wish will glow here."}</p></div>
          </>}
        </section>

        <section className="editorFeature">
          <div className="sectionHead"><div><span className="eyebrow">A song just for them</span><h3>Dedicated song</h3><p>Upload an audio file and add a personal dedication.</p></div></div>
          <label className="featureToggle"><input type="checkbox" checked={form.experience.enabled.song} onChange={(event) => updateExperience("enabled", { ...form.experience.enabled, song: event.target.checked })}/> Include song page</label>
          {form.experience.enabled.song && <>
            <div className="formGrid">
              <label>Song title<input value={form.experience.songTitle} onChange={(event) => updateExperience("songTitle", event.target.value)} placeholder="Our song"/></label>
              <label>Dedication<input value={form.experience.songDedication} onChange={(event) => updateExperience("songDedication", event.target.value)} placeholder="A little song for you…"/></label>
            </div>
            <label>Audio file (MP3, M4A, WAV, OGG, or WebM · max 12 MB)<input type="file" accept=".mp3,.m4a,.wav,.ogg,.webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm" onChange={chooseSong}/></label>
            {songPreview && <div className="mediaPreview"><audio controls preload="metadata" src={songPreview}>Your browser does not support audio playback.</audio><button type="button" className="smallBtn danger" onClick={() => { setSongFile(null); setSongPreview(""); updateExperience("songPath", ""); }}>Remove song</button></div>}
          </>}
        </section>

        <section className="editorFeature">
          <div className="sectionHead"><div><span className="eyebrow">Keep this moment</span><h3>Memory photos</h3><p>Add up to eight photos with a caption for each.</p></div></div>
          <label className="featureToggle"><input type="checkbox" checked={form.experience.enabled.memory} onChange={(event) => updateExperience("enabled", { ...form.experience.enabled, memory: event.target.checked })}/> Include memory page</label>
          {form.experience.enabled.memory && <>
            <label>Memory page title<input value={form.experience.memoryTitle} onChange={(event) => updateExperience("memoryTitle", event.target.value)} placeholder="A memory I will always cherish"/></label>
            {photos.map((photo, index) => <div className="memoryEditor" key={`${photo.path}-${index}`}>
              {photo.preview && <img src={photo.preview} alt={photo.caption || `Memory ${index + 1} preview`}/>}
              <div className="memoryEditorFields">
                <label>Photo {index + 1}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (!mediaType(file, imageTypes) || file.size > 8 * 1024 * 1024) {
                    setMessage("Choose a JPG, PNG, or WebP photo up to 8 MB.");
                    event.target.value = "";
                    return;
                  }
                  const preview = URL.createObjectURL(file);
                  blobUrls.current.push(preview);
                  updatePhoto(index, { file, preview, path: "" });
                  event.target.value = "";
                }}/></label>
                <label>Caption<input value={photo.caption} onChange={(event) => updatePhoto(index, { caption: event.target.value })} placeholder="Our first trip together…"/></label>
                <div className="photoActions">
                  <button type="button" className="smallBtn" disabled={index === 0} onClick={() => setPhotos((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>Move up</button>
                  <button type="button" className="smallBtn" disabled={index === photos.length - 1} onClick={() => setPhotos((current) => { const next = [...current]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })}>Move down</button>
                  <button type="button" className="smallBtn danger" onClick={() => setPhotos((current) => current.filter((_, position) => position !== index))}>Remove photo</button>
                </div>
              </div>
            </div>)}
            <label className="uploadButton">+ Add a memory photo<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={addMemoryPhoto}/></label>
          </>}
        </section>

        <section className="editorFeature">
          <div className="sectionHead"><div><span className="eyebrow">Make a wish</span><h3>Blow out the candles</h3><p>Recipients can use a microphone or hold a button to blow.</p></div></div>
          <label className="featureToggle"><input type="checkbox" checked={form.experience.enabled.candles} onChange={(event) => updateExperience("enabled", { ...form.experience.enabled, candles: event.target.checked })}/> Include candle page</label>
        </section>

        <section className="editorFeature">
          <div className="sectionHead"><div><span className="eyebrow">Your story, in order</span><h3>Surprise page sequence</h3><p>Use the arrows to arrange pages. Welcome and final greeting are always included.</p></div></div>
          <ol className="pageOrderList">{form.experience.pageOrder.map((page, index) => <li key={page}>
            <span>{index + 1}. {pageLabels[page]}{page === "welcome" || page === "final" ? " · required" : !form.experience.enabled[page] ? " · off" : ""}</span>
            <div><button type="button" className="smallBtn" aria-label={`Move ${pageLabels[page]} earlier`} disabled={page === "welcome" || page === "final" || index === 0 || form.experience.pageOrder[index - 1] === "welcome"} onClick={() => movePage(page, -1)}>↑</button><button type="button" className="smallBtn" aria-label={`Move ${pageLabels[page]} later`} disabled={page === "welcome" || page === "final" || index === form.experience.pageOrder.length - 1 || form.experience.pageOrder[index + 1] === "final"} onClick={() => movePage(page, 1)}>↓</button></div>
          </li>)}</ol>
          <div className="pageToggles">{optionalPages.map((page) => <label className="featureToggle" key={page}><input type="checkbox" checked={form.experience.enabled[page]} onChange={(event) => updateExperience("enabled", { ...form.experience.enabled, [page]: event.target.checked })}/>{pageLabels[page]}</label>)}</div>
        </section>

        <div className="actions"><button className="secondary" onClick={() => save(false)} disabled={busy}>{busy ? "Saving…" : "Save draft"}</button><button className="primary" onClick={() => save(true)} disabled={busy}>{busy ? "Saving…" : "Publish surprise ↗"}</button>{editing && <button className="smallBtn" onClick={resetForm}>New surprise</button>}</div>
        {message && <div className="notice">{message}</div>}
      </section>
      <section className="panel">
        <div className="sectionHead"><div><span className="eyebrow">Your creations</span><h2>My surprises</h2></div><span className="pill">{items.length} saved</span></div>
        {items.length === 0 ? <p>No surprises yet. Create your first one above!</p> : <div className="itemList">{items.map((item) => <article className="item" key={item.id}><div><strong>{item.title}</strong><p>For {item.recipient_name} · {item.published ? "Published" : "Draft"}</p>{item.published && <Link href={`/s/${item.slug}`} target="_blank">Open share page ↗</Link>}</div><div className="itemActions"><button className="smallBtn" onClick={() => edit(item)}>Edit</button><button className="smallBtn danger" onClick={() => remove(item.id)}>Delete</button>{item.published && <button className="smallBtn" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/s/${item.slug}`).then(() => setMessage("Share link copied!"))}>Copy link</button>}</div></article>)}</div>}
      </section>
    </>}
    <footer>WishBloom · Built for meaningful moments ✨</footer>
  </main>;
}
