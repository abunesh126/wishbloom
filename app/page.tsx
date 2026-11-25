 "use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Surprise } from "../lib/supabase";

const blank = {
  title: "A little surprise for you",
  recipient_name: "",
  sender_name: "",
  occasion_date: "",
  letter: "",
  wishes: ["", "", ""],
  theme: "rose",
};

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [form, setForm] = useState(blank);
  const [items, setItems] = useState<Surprise[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadItems() {
    if (!supabase || !session?.user) return;
    const { data, error } = await supabase.from("surprises").select("*").eq("owner_id", session.user.id).order("created_at", { ascending: false });
    if (error) setMessage(error.message); else setItems((data || []) as Surprise[]);
  }
  useEffect(() => { loadItems(); }, [session]);

  async function auth() {
    if (!supabase) { setMessage("Set your Supabase URL and anon key in .env.local first."); return; }
    setBusy(true); setMessage("");
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (authMode === "signup" && !result.data.session) setMessage("Account created. Check your email to confirm, then log in.");
    else setMessage("Welcome to WishBloom!");
  }

  function update<K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }
  function resetForm() { setForm(blank); setEditing(null); setEditingSlug(null); }
  async function save(publish: boolean) {
    if (!supabase || !session?.user) return;
    if (!form.recipient_name.trim()) { setMessage("Add the recipient's name first."); return; }
    setBusy(true); setMessage("");
    const payload = {
      ...form,
      recipient_name: form.recipient_name.trim(),
      sender_name: form.sender_name.trim() || "Someone special",
      wishes: form.wishes.map(w => w.trim()).filter(Boolean),
      slug: editingSlug || `${form.recipient_name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 10)}`,
      occasion_date: form.occasion_date || null,
      published: publish,
      owner_id: session.user.id,
    };
    let result: any;
    if (editing) result = await supabase.from("surprises").update(payload).eq("id", editing).select().single();
    else result = await supabase.from("surprises").insert(payload).select().single();
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    setMessage(publish ? `Published! Share: ${window.location.origin}/s/${result.data.slug}` : "Draft saved.");
    setEditing(result.data.id);
    setEditingSlug(result.data.slug);
    await loadItems();
  }
  async function edit(item: Surprise) {
    setEditing(item.id);
    setEditingSlug(item.slug);
    setForm({
      title: item.title, recipient_name: item.recipient_name, sender_name: item.sender_name,
      occasion_date: item.occasion_date || "", letter: item.letter, wishes: [...item.wishes, "", ""].slice(0, Math.max(3, item.wishes.length)),
      theme: item.theme,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove(id: string) {
    if (!supabase || !confirm("Delete this surprise permanently?")) return;
    const { error } = await supabase.from("surprises").delete().eq("id", id);
    if (error) setMessage(error.message); else { setMessage("Surprise deleted."); loadItems(); if (editing === id) resetForm(); }
  }
  async function logout() { await supabase?.auth.signOut(); resetForm(); setItems([]); }

  if (!supabase) return <main className="shell"><header className="brand">💗 WishBloom</header><section className="panel"><span className="eyebrow">Setup needed</span><h1>Connect your database</h1><p>Create a Supabase project, copy <code>.env.example</code> to <code>.env.local</code>, and add your project URL and anon key. Follow SETUP.md.</p></section></main>;

  return <main className="shell">
    <header className="top"><Link className="brand" href="/">💗 WishBloom</Link><span className="tagline">Make a little surprise. Share a lot of love.</span>{session && <button className="smallBtn" onClick={logout}>Log out</button>}</header>
    <section className="hero panel">
      <span className="eyebrow">A tiny website, a big feeling</span>
      <h1 className="serif">Make someone’s day<br/><em>unforgettable.</em></h1>
      <p>Create a personal surprise page with your letter, wishes, and a little magic — then share one link.</p>
    </section>

    {!session ? <section className="panel auth">
      <h2>{authMode === "signup" ? "Create your free account" : "Welcome back"}</h2>
      <p>Save and manage your surprise pages.</p>
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
      <button className="primary" disabled={busy} onClick={auth}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Log in"}</button>
      <p className="switch">{authMode === "signup" ? "Already have an account?" : "New to WishBloom?"} <button onClick={()=>setAuthMode(authMode==="signup"?"login":"signup")}>{authMode==="signup"?"Log in":"Create account"}</button></p>
    </section> : <>
      <section className="editor panel">
        <div className="sectionHead"><div><span className="eyebrow">Surprise builder</span><h2>{editing ? "Edit your surprise" : "Create a surprise"}</h2></div><span className="pill">Free starter</span></div>
        <div className="formGrid">
          <label>Surprise title<input value={form.title} onChange={e=>update("title",e.target.value)} placeholder="A little surprise for you"/></label>
          <label>Recipient name *<input value={form.recipient_name} onChange={e=>update("recipient_name",e.target.value)} placeholder="Who is it for?"/></label>
          <label>Your name<input value={form.sender_name} onChange={e=>update("sender_name",e.target.value)} placeholder="From…"/></label>
          <label>Special date<input type="date" value={form.occasion_date} onChange={e=>update("occasion_date",e.target.value)}/></label>
          <label>Theme<select value={form.theme} onChange={e=>update("theme",e.target.value)}><option value="rose">Rose pink</option><option value="lavender">Lavender dream</option><option value="peach">Peach glow</option><option value="midnight">Midnight love</option></select></label>
        </div>
        <label>Your letter<textarea rows={8} value={form.letter} onChange={e=>update("letter",e.target.value)} placeholder="Write your birthday / friendship letter here…"/></label>
        <div className="wishInputs"><strong>Wishes</strong>{form.wishes.map((w,i)=><input key={i} value={w} onChange={e=>update("wishes",form.wishes.map((x,j)=>j===i?e.target.value:x))} placeholder={`Wish ${i+1}`}/>)}
          <button className="smallBtn" onClick={()=>update("wishes",[...form.wishes,""])}>+ Add a wish</button>
        </div>
        <div className="actions"><button className="secondary" onClick={()=>save(false)} disabled={busy}>Save draft</button><button className="primary" onClick={()=>save(true)} disabled={busy}>{busy?"Saving…":"Publish surprise ↗"}</button>{editing && <button className="smallBtn" onClick={resetForm}>New surprise</button>}</div>
        {message && <div className="notice">{message}</div>}
      </section>
      <section className="panel">
        <div className="sectionHead"><div><span className="eyebrow">Your creations</span><h2>My surprises</h2></div><span className="pill">{items.length} saved</span></div>
        {items.length===0?<p>No surprises yet. Create your first one above!</p>:<div className="itemList">{items.map(item=><article className="item" key={item.id}><div><strong>{item.title}</strong><p>For {item.recipient_name} · {item.published?"Published":"Draft"}</p>{item.published&&<Link href={`/s/${item.slug}`} target="_blank">Open share page ↗</Link>}</div><div className="itemActions"><button className="smallBtn" onClick={()=>edit(item)}>Edit</button><button className="smallBtn danger" onClick={()=>remove(item.id)}>Delete</button>{item.published&&<button className="smallBtn" onClick={()=>navigator.clipboard.writeText(`${window.location.origin}/s/${item.slug}`).then(()=>setMessage("Share link copied!"))}>Copy link</button>}</div></article>)}</div>}
      </section>
    </>}
    <footer>WishBloom · Built for meaningful moments ✨</footer>
  </main>;
}