 "use client";
import { useState } from "react";
type Props={surprise:{title:string;recipient_name:string;sender_name:string;occasion_date:string|null;letter:string;wishes:string[];theme:string;published:boolean}};
export default function SurpriseExperience({surprise:s}:Props){
 const [opened,setOpened]=useState(false),[wish,setWish]=useState(0);
 const theme=s.theme==="lavender"?"lavender":s.theme==="peach"?"peach":s.theme==="midnight"?"midnight":"rose";
 return <main className={`recipient ${theme}`}>
  <div className="recipientWrap">
   <span className="eyebrow">A surprise just for you</span>
   <h1 className="serif">Happy special day,<br/><em>{s.recipient_name}</em>! 🎂</h1>
   <p>{s.title}</p>
   {s.occasion_date&&<span className="dateTag">{new Date(s.occasion_date+"T12:00:00").toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"})}</span>}
   <div className="recipientCake">🎂</div>
   <button className="primary" onClick={()=>setOpened(true)}>{opened?"Your letter is open 💌":"Open your surprise 💝"}</button>
   {opened&&<section className="recipientLetter"><h2 className="serif">A letter for you</h2><p className="letterBody">{s.letter||"You are special. I hope this day brings you a lot of happiness!"}</p><p className="sign">With love,<br/>{s.sender_name}</p></section>}
   {opened&&s.wishes?.length>0&&<section className="wishReveal"><h2 className="serif">A few wishes ✨</h2><div className="wishCard">⭐ {s.wishes[Math.min(wish,s.wishes.length-1)]}</div><div className="wishControls"><button className="secondary" disabled={wish===0} onClick={()=>setWish(w=>w-1)}>← Previous</button><span>{wish+1} / {s.wishes.length}</span><button className="primary" disabled={wish===s.wishes.length-1} onClick={()=>setWish(w=>w+1)}>Next wish →</button></div></section>}
   <footer>Made with love on WishBloom 💗</footer>
  </div>
 </main>
}