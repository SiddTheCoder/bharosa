/* ============ Components — Bharosa Trust Score ============ */
const { useState, useEffect, useRef } = React;

/* ---- tiny inline icons ---- */
const Ico = {
  check:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5"/></svg>,
  shieldCheck:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>,
  spark:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>,
  arrowUp:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 17 17 7M7 7h10v10"/></svg>,
  trend:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17 9 11l4 4 8-8"/><path d="M17 7h4v4"/></svg>,
  links:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.1 11 15.9 7M8.1 13l7.8 4"/></svg>,
  shield:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>,
  users:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6.5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.7"/></svg>,
  bolt:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>,
  qr:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h.01M17 21h4v-4"/></svg>,
  mic:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>,
  bank:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10 12 4l9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 21h18"/></svg>,
  calendar:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>,
  clock:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  chevron:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  arrowRight:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  receipt:(p)=> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21l2-1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3 5 4.2"/><path d="M8 9h8M8 13h5"/></svg>,
};

/* ---- count-up hook ---- */
function useCountUp(target, run, dur=1300){
  const [val,setVal]=useState(0);
  useEffect(()=>{
    if(!run) return;
    let raf, start;
    const ease=t=>1-Math.pow(1-t,3);
    const step=(ts)=>{
      if(start==null) start=ts;
      const p=Math.min((ts-start)/dur,1);
      setVal(Math.round(ease(p)*target));
      if(p<1) raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
    return ()=>cancelAnimationFrame(raf);
  },[run,target,dur]);
  return val;
}

/* ---- circular gauge ---- */
function Gauge({score, outOf, run}){
  const R=98, C=2*Math.PI*R;
  const pct = score/outOf;
  const num = useCountUp(score, run);
  const [armed,setArmed]=useState(false);
  useEffect(()=>{ if(run){ const t=setTimeout(()=>setArmed(true),80); return ()=>clearTimeout(t);} },[run]);
  const offset = armed ? C*(1-pct) : C;
  return (
    <div className="gauge">
      <svg width="228" height="228" viewBox="0 0 228 228">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#16B488"/>
            <stop offset="1" stopColor="#0C8E6B"/>
          </linearGradient>
        </defs>
        <circle className="track" cx="114" cy="114" r={R} fill="none" strokeWidth="15"/>
        <circle className="prog" cx="114" cy="114" r={R} fill="none" strokeWidth="15"
          strokeDasharray={C} strokeDashoffset={offset}/>
      </svg>
      <div className="gauge-center">
        <div className="gauge-num">{num}</div>
        <div className="gauge-out">out of {outOf}</div>
        <div className="gauge-band">Top 30% band</div>
      </div>
    </div>
  );
}

/* ---- chip ---- */
function Chip({variant, icon, children}){
  const I = icon ? Ico[icon] : null;
  return <span className={`chip chip-${variant}`}>{I && <I/>}{children}</span>;
}

/* ---- breakdown row ---- */
function BreakdownRow({icon, name, cap, pct, status, detail, run, delay, grey}){
  const [open,setOpen]=useState(false);
  const [fill,setFill]=useState(0);
  const I = Ico[icon];
  useEffect(()=>{
    if(!run) return;
    const t=setTimeout(()=>setFill(pct),delay||0);
    return ()=>clearTimeout(t);
  },[run,pct,delay]);
  return (
    <div className={`bd-row${open?' open':''}`} onClick={()=>setOpen(o=>!o)}>
      <div className="bd-top">
        <div className={`bd-ico${grey?' grey':''}`}><I/></div>
        <div className="bd-mid">
          <div className="bd-name">{name}</div>
          <div className="bd-cap">{cap}</div>
        </div>
        <span className={`bd-badge${grey?' todo':''}`}>{status}</span>
        <span className="bd-chev"><Ico.chevron/></span>
      </div>
      <div className="bd-bar"><div className={`bd-fill${grey?' grey':''}`} style={{width:fill+'%'}}/></div>
      <div className="bd-detail" onClick={e=>e.stopPropagation()}>
        <div className="bd-detail-inner" dangerouslySetInnerHTML={{__html:detail}}/>
      </div>
    </div>
  );
}

/* ---- in-view reveal wrapper ---- */
function Reveal({children, className=""}){
  const ref=useRef(null);
  const [seen,setSeen]=useState(false);
  useEffect(()=>{
    const el=ref.current;
    if(!el) return;
    const reveal=()=>setSeen(true);
    // already in view on mount?
    const r=el.getBoundingClientRect();
    if(r.top < window.innerHeight*0.92){ reveal(); return; }
    const io=new IntersectionObserver(([e])=>{
      if(e.isIntersecting){ reveal(); io.disconnect(); }
    },{threshold:0, rootMargin:'0px 0px -8% 0px'});
    io.observe(el);
    // safety net so nothing ever stays hidden
    const t=setTimeout(reveal,2500);
    return ()=>{ io.disconnect(); clearTimeout(t); };
  },[]);
  return <div ref={ref} className={`rise ${seen?'in':''} ${className}`}>{typeof children==='function'?children(seen):children}</div>;
}

Object.assign(window,{ Ico, Gauge, Chip, BreakdownRow, Reveal, useCountUp });
