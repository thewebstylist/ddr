import sys, pathlib

BODY = """
<div class="wrap">
  <header class="bar">
    <span class="mark">Trish <em>Steele</em></span>
    <nav class="nv"><a>Mentorship</a><a>Her Story</a><a>Speaking</a><a>The Book</a><a>Contact</a></nav>
    <a class="cta">Apply <span>&rarr;</span></a>
  </header>

  <section class="hero">
    <div class="htxt">
      <p class="kick">Mentorship with Trish Steele</p>
      <h1 class="ttl">
        <span class="a">Ageless.</span>
        <span class="b">Fearless.</span>
        <span class="c">Divinely Connected.</span>
      </h1>
      <p class="lede">You reached the summit and found it quiet up there. Trish mentors
        accomplished women through the renewal that success never delivered.</p>
      <div class="btns">
        <a class="btn">Apply for Mentorship <span>&rarr;</span></a>
        <a class="btn ghost">Book a 15 minute call</a>
      </div>
    </div>
    <div class="hplate"><div class="ph"><span>Portrait 01</span></div></div>
  </section>

  <section class="strip">
    <div><b>2,000+</b><i>Women and children served</i></div>
    <div><b>2011</b><i>President&rsquo;s Volunteer Service Award</i></div>
    <div><b>7</b><i>Decades of the invincible journey</i></div>
  </section>
</div>
"""

SHARED = """
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg2);font-family:var(--fbody);
  font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{position:relative;z-index:2}
.bar{display:flex;align-items:center;justify-content:space-between;gap:2rem;
  padding:1.5rem clamp(1.5rem,4vw,4.5rem);}
.mark{font-family:var(--fdisp);font-size:1.3rem;color:var(--fg);letter-spacing:.01em}
.mark em{font-style:italic;color:var(--acc)}
.nv{display:flex;gap:1.9rem}
.nv a{font-family:var(--fmeta);font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;
  color:var(--mut);text-decoration:none}
.cta{font-family:var(--fmeta);font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;
  padding:.8rem 1.4rem;background:var(--accBg);color:var(--accFg);text-decoration:none;
  border:1px solid var(--accBd);border-radius:var(--rad)}
.hero{display:grid;grid-template-columns:1.75fr 1fr;min-height:78vh;gap:clamp(2rem,4vw,4.5rem);
  align-items:center;padding:clamp(1rem,2vw,2rem) clamp(1.5rem,4vw,4.5rem) clamp(3rem,5vw,5rem)}
.kick{font-family:var(--fmeta);font-size:.7rem;letter-spacing:.24em;text-transform:uppercase;
  color:var(--acc);margin:0 0 1.5rem;padding-bottom:.9rem;border-bottom:1px solid var(--rule);
  display:inline-block}
.ttl{font-family:var(--fdisp);margin:0;font-weight:var(--dw);
  font-size:clamp(3rem, 1rem + 8.6vw, 9.5rem);line-height:.88;letter-spacing:var(--dls)}
.ttl span{display:block}
.ttl .a{color:var(--fg)}
.ttl .b{font-style:italic;color:var(--fg)}
.ttl .c{color:var(--acc)}
.lede{margin:2rem 0 0;max-width:40ch;color:var(--fg2);font-size:1.06rem}
.btns{display:flex;gap:1rem;margin-top:2.5rem;flex-wrap:wrap}
.btn{font-family:var(--fmeta);font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;
  padding:1rem 1.7rem;background:var(--accBg);color:var(--accFg);text-decoration:none;
  border:1px solid var(--accBd);border-radius:var(--rad)}
.btn.ghost{background:transparent;color:var(--fg);border-color:var(--rule)}
.hplate .ph{aspect-ratio:3/4;background:var(--plate);border:1px solid var(--rule);
  border-radius:var(--rad);display:flex;align-items:flex-end;padding:1.5rem;position:relative;
  overflow:hidden}
.hplate .ph::after{content:"";position:absolute;inset:0;
  background:linear-gradient(122deg,transparent 30%,var(--sheen) 50%,transparent 70%)}
.hplate span{font-family:var(--fmeta);font-size:.68rem;letter-spacing:.2em;
  text-transform:uppercase;color:var(--acc);position:relative;z-index:1}
.strip{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;
  padding:clamp(2rem,4vw,3.5rem) clamp(1.5rem,4vw,4.5rem);border-top:1px solid var(--rule)}
.strip b{display:block;font-family:var(--fdisp);font-weight:var(--dw);
  font-size:clamp(2.2rem,1.2rem + 2.6vw,3.6rem);line-height:1;color:var(--fg);
  letter-spacing:var(--dls)}
.strip i{display:block;margin-top:.9rem;font-family:var(--fmeta);font-size:.68rem;
  letter-spacing:.14em;text-transform:uppercase;color:var(--mut);font-style:normal}
"""

def build(name, title, fonts, tokens, extra=""):
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
{fonts}
<style>
:root{{{tokens}}}
{SHARED}
{extra}
</style></head><body>{BODY}</body></html>"""
    pathlib.Path(name).write_text(html)
    print("wrote", name)
