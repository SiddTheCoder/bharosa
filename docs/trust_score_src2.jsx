/* ============ App — Bharosa Trust Score ============ */
const { useState:useStateA, useEffect:useEffectA } = React;

function App(){
  const [run,setRun]=useStateA(false);
  useEffectA(()=>{ const t=setTimeout(()=>setRun(true),120); return ()=>clearTimeout(t); },[]);

  const breakdown=[
    { icon:'users', name:'Community vouches', cap:'2 trusted businesses vouched for you', pct:72, status:'Done',
      detail:'Two verified businesses in your area vouched for you. <b>Each new anchor vouch adds the most points</b> — a third could push you into the next band.' },
    { icon:'receipt', name:'On-time bill payments', cap:'5 of 6 utility bills paid on time', pct:84, status:'Done',
      detail:'You\u2019ve paid <b>5 of your last 6</b> electricity & water bills on time. Keep a clean streak for 3 more months to max this out.' },
    { icon:'qr', name:'Monthly sales (QR)', cap:'Steady QR sales every month', pct:90, status:'Done',
      detail:'Your QR receipts show <b>steady monthly sales</b> with low volatility. Consistency matters more than size here.' },
    { icon:'mic', name:'Business interview', cap:'Completed the business interview', pct:100, status:'Done',
      detail:'You completed the voice interview in Nepali. <b>Fully verified</b> — no further action needed.' },
  ];

  const activity=[
    { icon:'shieldCheck', txt:'Anchor vouch received from a verified supplier.', time:'2 hours ago' },
    { icon:'trend', txt:'Trust outlook improved after a utility payment signal.', time:'Yesterday' },
    { icon:'mic', txt:'Voice interview is ready in Nepali, with a typed fallback.', time:'2 days ago' },
  ];

  return (
    <div className="shell">

      {/* ============ HERO ============ */}
      <div className="hero">
        <div className="hero-top">
          <Chip variant="soft" icon="shieldCheck">Verified</Chip>
          <Chip variant="green" icon="spark">Growing</Chip>
          <Chip variant="ghost" icon="shield">Low risk</Chip>
          <span className="spacer"></span>
          <span className="hero-updated"><span className="dot"></span>Updated just now</span>
        </div>

        <div className="hero-main">
          <Gauge score={712} outOf={1000} run={run}/>

          <div className="hero-r">
            <div className="hero-h">Your score is <strong>712</strong> <span className="dim">— steady & trusted</span></div>
            <div className="hero-sub">Strong enough to borrow more, at better terms.</div>

            <div className="borrow">
              <div className="borrow-l">
                <div className="borrow-k"><Ico.bank style={{width:14,height:14}}/> Pre-qualified to borrow</div>
                <div className="borrow-v"><span className="cur">NPR</span>120,000</div>
                <div className="borrow-note">Safe amount today · grows with your score</div>
              </div>
              <button className="btn">See your offer <Ico.arrowRight/></button>
            </div>
          </div>
        </div>

        {/* mini stats */}
        <div className="hero-stats">
          <div className="hstat">
            <div className="k">This week</div>
            <div className="v">+24 pts</div>
            <div className="d"><Ico.arrowUp/> Trending up</div>
          </div>
          <div className="hstat">
            <div className="k">Evidence links</div>
            <div className="v">38</div>
            <div className="d"><Ico.arrowUp/> +6 new</div>
          </div>
          <div className="hstat">
            <div className="k">Confidence</div>
            <div className="v">74%</div>
            <div className="d"><Ico.arrowUp/> Band tightening</div>
          </div>
        </div>
      </div>

      {/* ============ WHAT MAKES UP YOUR SCORE ============ */}
      <Reveal className="card sec">
        {seen=>(<React.Fragment>
          <div className="sec-head">
            <div className="sec-ico"><Ico.bolt/></div>
            <div className="sec-head-wrap">
              <div className="sec-title">What makes up your trust score</div>
              <p className="sec-desc">Four things build your score. Tap any one to see what moves it — green means it's helping you.</p>
            </div>
          </div>
          <div className="bd-list">
            {breakdown.map((b,i)=>(
              <BreakdownRow key={i} {...b} run={seen} delay={150+i*120}/>
            ))}
          </div>
        </React.Fragment>)}
      </Reveal>

      {/* ============ WHAT YOU CAN BORROW ============ */}
      <Reveal className="card sec borrow-sec">
        {seen=>(<React.Fragment>
          <div className="sec-head">
            <div className="sec-ico"><Ico.bank/></div>
            <div className="sec-head-wrap">
              <div className="sec-title">What you can borrow</div>
              <p className="sec-desc">A safe amount based on your score today. It grows as your score grows.</p>
            </div>
          </div>
          <div className="big"><span className="cur">NPR</span>120,000</div>
          <p className="ln">At a score of 800 you could unlock up to <b style={{color:'var(--ink)'}}>NPR 180,000</b>. You're <b style={{color:'var(--ink)'}}>88 points</b> away.</p>

          <div className="range">
            <div className="range-bar">
              <div className="range-fill" style={{width: seen ? '67%' : '0%'}}></div>
              <div className="range-knob" style={{left: seen ? '67%' : '0%'}}></div>
            </div>
            <div className="range-cap"><span>NPR 0</span><span>Today · NPR 120k</span><span>NPR 180k</span></div>
          </div>

          <div className="borrow-terms">
            <div className="term">
              <div className="tk"><Ico.calendar/> Repayment</div>
              <div className="tv">Weekly installments</div>
            </div>
            <div className="term">
              <div className="tk"><Ico.clock/> Grace period</div>
              <div className="tv">2 weeks</div>
            </div>
            <div className="term">
              <div className="tk"><Ico.shieldCheck/> Status</div>
              <div className="tv">Pre-qualified</div>
            </div>
          </div>
        </React.Fragment>)}
      </Reveal>

      {/* ============ RECENT ACTIVITY ============ */}
      <Reveal className="card sec">
        <div className="sec-head">
          <div className="sec-ico"><Ico.clock/></div>
          <div className="sec-head-wrap">
            <div className="sec-title">Recent activity</div>
            <p className="sec-desc">The latest signals feeding your <span className="deva">भरोसा</span> score.</p>
          </div>
        </div>
        <div className="act-list">
          {activity.map((a,i)=>{
            const I=Ico[a.icon];
            return (
              <div className="act" key={i}>
                <div className="act-dot"><I/></div>
                <div className="act-body">
                  <div className="act-txt">{a.txt}</div>
                  <div className="act-time">{a.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
