/* NEON FUEL · scroll engine
   Lenis for smooth scroll, GSAP ScrollTrigger for pinned acts. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- product artwork (SVG) ---------- */
  function canSVG(flavor) {
    var isLB = flavor === "lb";
    var name = isLB ? "Lemon Blueberry" : "Electric Blue Raspberry";
    var fruit = isLB
      ? '<g transform="translate(100 278)">' +
          '<circle cx="-30" cy="6" r="15" fill="var(--can-fruit)" stroke="var(--can-fruit-line)" stroke-width="3"/>' +
          '<circle cx="-4" cy="18" r="15" fill="var(--can-fruit)" stroke="var(--can-fruit-line)" stroke-width="3"/>' +
          '<circle cx="-16" cy="-12" r="13" fill="var(--can-fruit)" stroke="var(--can-fruit-line)" stroke-width="3"/>' +
          '<circle cx="30" cy="0" r="24" fill="#fff5b0" stroke="var(--can-fruit-line)" stroke-width="3"/>' +
          '<g stroke="var(--can-fruit-line)" stroke-width="2.5"><line x1="30" y1="-24" x2="30" y2="24"/><line x1="6" y1="0" x2="54" y2="0"/><line x1="13" y1="-17" x2="47" y2="17"/><line x1="47" y1="-17" x2="13" y2="17"/></g>' +
        '</g>'
      : '<g transform="translate(100 278)" fill="var(--can-fruit)" stroke="var(--can-fruit-line)" stroke-width="3">' +
          '<circle cx="0" cy="-26" r="11"/><circle cx="-16" cy="-12" r="11"/><circle cx="16" cy="-12" r="11"/>' +
          '<circle cx="-24" cy="6" r="11"/><circle cx="0" cy="4" r="11"/><circle cx="24" cy="6" r="11"/>' +
          '<circle cx="-14" cy="24" r="11"/><circle cx="14" cy="24" r="11"/>' +
          '<path d="M-6 -42 Q0 -56 8 -44 Q2 -46 -6 -42Z" fill="var(--can-fruit-line)" stroke="none"/>' +
          '<path d="M-70 40 q14 -14 28 0 q10 8 20 2" fill="none" stroke="var(--can-fruit)" stroke-width="7" stroke-linecap="round"/>' +
        '</g>';
    return '<svg viewBox="0 0 200 360" role="img" aria-label="NEON FUEL ' + name + ' can">' +
      '<ellipse cx="100" cy="342" rx="66" ry="10" fill="rgba(0,0,0,.35)"/>' +
      '<rect x="32" y="26" width="136" height="310" rx="26" fill="var(--can-body)"/>' +
      '<rect x="32" y="306" width="136" height="30" rx="14" fill="var(--can-tag)"/>' +
      '<rect x="32" y="26" width="136" height="310" rx="26" fill="url(#can-shade)"/>' +
      '<ellipse cx="100" cy="28" rx="68" ry="13" fill="url(#can-rim)"/>' +
      '<ellipse cx="100" cy="27" rx="58" ry="9" fill="var(--can-body-deep)"/>' +
      '<rect x="88" y="20" width="24" height="9" rx="4" fill="#dfe6f2"/>' +
      '<text x="100" y="72" text-anchor="middle" font-family="Space Grotesk, system-ui, sans-serif" font-weight="700" font-size="12" fill="var(--can-flavor)">' + name + '</text>' +
      '<text x="42" y="132" font-family="Archivo, Archivo Black, system-ui, sans-serif" font-weight="900" font-size="46" letter-spacing="-1" fill="var(--can-title)">NEON</text>' +
      '<text x="42" y="180" font-family="Archivo, Archivo Black, system-ui, sans-serif" font-weight="900" font-size="46" letter-spacing="-1" fill="var(--can-title)">FUEL</text>' +
      '<circle cx="152" cy="165" r="15" fill="none" stroke="var(--can-title)" stroke-width="3"/>' +
      '<path d="M156 154 146 168h7l-2 10 10-14h-7z" fill="var(--can-title)"/>' +
      '<text x="100" y="212" text-anchor="middle" font-family="Space Grotesk, system-ui, sans-serif" font-weight="700" font-size="15" fill="var(--can-tag)">Fuel What’s Next</text>' +
      fruit +
      '<text x="100" y="326" text-anchor="middle" font-family="Space Grotesk, system-ui, sans-serif" font-weight="500" font-size="8.5" fill="rgba(255,255,255,.85)">Powered by SterlingCreations.AI</text>' +
      '</svg>';
  }

  function pintSVG() {
    return '<svg viewBox="0 0 240 260" role="img" aria-label="NEON FUEL Electric Blue Raspberry ice cream pint">' +
      '<ellipse cx="120" cy="246" rx="86" ry="10" fill="rgba(0,0,0,.35)"/>' +
      '<path d="M36 70 L52 236 Q54 246 64 246 L176 246 Q186 246 188 236 L204 70Z" fill="#1e8be8"/>' +
      '<path d="M36 70 L52 236 Q54 246 64 246 L176 246 Q186 246 188 236 L204 70Z" fill="url(#can-shade)"/>' +
      '<path d="M40 110 L200 110 L196 150 L44 150Z" fill="#ff2fa6" opacity=".95"/>' +
      '<ellipse cx="120" cy="70" rx="86" ry="20" fill="#ff2fa6"/>' +
      '<ellipse cx="120" cy="62" rx="86" ry="20" fill="#ff5fbb"/>' +
      '<ellipse cx="120" cy="62" rx="86" ry="20" fill="url(#can-shade)"/>' +
      '<text x="120" y="100" text-anchor="middle" font-family="Space Grotesk, system-ui, sans-serif" font-weight="700" font-size="11" fill="#c8ff3d">Electric Blue Raspberry</text>' +
      '<text x="120" y="139" text-anchor="middle" font-family="Archivo, Archivo Black, system-ui, sans-serif" font-weight="900" font-size="30" fill="#f3e6ee">NEON FUEL</text>' +
      '<text x="120" y="176" text-anchor="middle" font-family="Archivo, Archivo Black, system-ui, sans-serif" font-weight="800" font-size="16" letter-spacing="3" fill="#c8ff3d">ICE CREAM</text>' +
      '<g transform="translate(120 208)" fill="#ff2fa6" stroke="#c8ff3d" stroke-width="2.5">' +
        '<circle cx="0" cy="-12" r="7"/><circle cx="-11" cy="-3" r="7"/><circle cx="11" cy="-3" r="7"/><circle cx="-6" cy="9" r="7"/><circle cx="6" cy="9" r="7"/>' +
      '</g>' +
      '</svg>';
  }

  function popcornSVG() {
    var puffs = "";
    var pts = [[70, 52], [96, 34], [124, 30], [152, 38], [176, 56], [86, 22], [140, 14], [112, 12], [160, 24], [58, 70]];
    for (var i = 0; i < pts.length; i++) {
      puffs += '<g transform="translate(' + pts[i][0] + ' ' + pts[i][1] + ')"><circle r="16" fill="#fff5c4"/><circle cx="-9" cy="-6" r="10" fill="#fffbe6"/><circle cx="9" cy="-5" r="10" fill="#fff2b4"/><circle cx="0" cy="8" r="9" fill="#ffe7a0"/></g>';
    }
    return '<svg viewBox="0 0 240 280" role="img" aria-label="NEON FUEL popcorn bag">' +
      '<ellipse cx="120" cy="268" rx="84" ry="10" fill="rgba(0,0,0,.35)"/>' +
      puffs +
      '<path d="M44 70 L34 250 Q34 262 46 262 L194 262 Q206 262 206 250 L196 70Z" fill="#1e8be8"/>' +
      '<g fill="#c8ff3d" opacity=".9">' +
        '<path d="M64 70 L58 262 L78 262 L84 70Z"/><path d="M104 70 L100 262 L120 262 L124 70Z"/><path d="M144 70 L142 262 L162 262 L164 70Z"/>' +
      '</g>' +
      '<path d="M44 70 L34 250 Q34 262 46 262 L194 262 Q206 262 206 250 L196 70Z" fill="url(#can-shade)"/>' +
      '<rect x="46" y="120" width="148" height="86" rx="14" fill="#05081a"/>' +
      '<text x="120" y="148" text-anchor="middle" font-family="Space Grotesk, system-ui, sans-serif" font-weight="700" font-size="10" fill="#c8ff3d">Electric Blue Raspberry</text>' +
      '<text x="120" y="176" text-anchor="middle" font-family="Archivo, Archivo Black, system-ui, sans-serif" font-weight="900" font-size="26" fill="#f3e6ee">NEON FUEL</text>' +
      '<text x="120" y="196" text-anchor="middle" font-family="Archivo, Archivo Black, system-ui, sans-serif" font-weight="800" font-size="13" letter-spacing="4" fill="#ff2fa6">POPCORN</text>' +
      '<path d="M44 70 Q120 92 196 70" fill="none" stroke="#ff2fa6" stroke-width="6" stroke-linecap="round"/>' +
      '</svg>';
  }

  $$("[data-can]").forEach(function (el) { el.innerHTML = canSVG(el.getAttribute("data-can")); });
  $$("[data-pint]").forEach(function (el) { el.innerHTML = pintSVG(); });
  $$("[data-popcorn]").forEach(function (el) { el.innerHTML = popcornSVG(); });

  /* ---------- split text ---------- */
  function splitWords(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    var out = "";
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { out += " "; return; }
          out += '<span class="w"><span>' + t + "</span></span>";
        });
      } else if (n.nodeType === 1) {
        out += '<span class="w"><span>' + n.outerHTML + "</span></span>";
      }
    });
    el.innerHTML = out;
    return $$(".w > span", el);
  }
  var splits = {};
  $$("[data-split]").forEach(function (el, i) {
    el.setAttribute("data-split-id", String(i));
    splits[i] = splitWords(el);
  });

  /* ---------- bail out gently for reduced motion / missing libs ---------- */
  if (!window.gsap || !window.ScrollTrigger) { $$("[data-split]").forEach(function (el) { el.classList.add("is-revealed"); }); return; }
  gsap.registerPlugin(ScrollTrigger);

  if (reduced) {
    $$("[data-split]").forEach(function (el) { el.classList.add("is-revealed"); });
    $$("[data-in]").forEach(function (el) { el.classList.add("is-in"); });
    $$(".step").forEach(function (el) { el.classList.add("is-active"); });
    setupProductsFallback();
    setupSound();
    return;
  }

  /* ---------- lenis ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0, duration: 1.4, easing: function (x) { return 1 - Math.pow(1 - x, 4); } });
      });
    });
  }

  /* ---------- progress + nav ---------- */
  var progress = $("#progress");
  var nav = $("#nav");
  var lastY = 0;
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: function (self) {
      progress.style.transform = "scaleX(" + self.progress + ")";
      var y = self.scroll();
      nav.classList.toggle("is-solid", y > 40);
      nav.classList.toggle("is-hidden", y > lastY + 6 && y > 300);
      if (y < lastY - 6) nav.classList.remove("is-hidden");
      lastY = y;
    }
  });
  $$(".nav__links a").forEach(function (a) {
    var target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target, start: "top 50%", end: "bottom 50%",
      onToggle: function (self) { a.classList.toggle("is-current", self.isActive); }
    });
  });

  /* ---------- cursor glow ---------- */
  if (finePointer) {
    var glow = $("#glow");
    var gx = window.innerWidth / 2, gy = window.innerHeight / 2, tx = gx, ty = gy;
    window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    gsap.ticker.add(function () {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = "translate(" + (gx - glow.offsetWidth / 2) + "px," + (gy - glow.offsetHeight / 2) + "px)";
    });
  }

  /* ---------- magnetic buttons, tilt cards ---------- */
  if (finePointer) {
    $$("[data-magnet]").forEach(function (btn) {
      var strength = 0.28;
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        gsap.to(btn, { x: dx * strength, y: dy * strength, duration: 0.35, ease: "power3.out", overwrite: "auto" });
      });
      btn.addEventListener("pointerleave", function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.45)", overwrite: "auto" });
      });
    });
    $$("[data-tilt]").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotateY: px * 10, rotateX: -py * 10, transformPerspective: 900, duration: 0.5, ease: "power3.out", overwrite: "auto" });
      });
      card.addEventListener("pointerleave", function () {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "power3.out", overwrite: "auto" });
      });
    });
  }

  /* ---------- intro ---------- */
  var intro = $("#intro");
  var heroSplit = splits[$('.hero__title').getAttribute("data-split-id")];
  var heroTL = gsap.timeline({ paused: true });
  heroTL
    .to($$("[data-hero-can]"), { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 0)
    .to(heroSplit, { y: "0%", duration: 0.9, ease: "power4.out", stagger: 0.07 }, 0.05)
    .to($("[data-hero-eyebrow]"), { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.2)
    .to($("[data-hero-lede]"), { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.45)
    .to($("[data-hero-actions]"), { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.6);

  gsap.set("[data-hero-can]", { y: 40, rotate: -10 });

  function playIntro() {
    if (lenis) lenis.stop();
    var chars = $$(".intro__char", intro);
    var tl = gsap.timeline({
      onComplete: function () { intro.remove(); if (lenis) lenis.start(); ScrollTrigger.refresh(); }
    });
    tl.to(chars, { y: 0, opacity: 1, duration: 0.6, ease: "power4.out", stagger: 0.05 })
      .to($(".intro__bolt", intro), { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, "-=0.25")
      .to(chars, { y: "-120%", opacity: 0, duration: 0.5, ease: "power3.in", stagger: 0.03 }, "+=0.35")
      .to($(".intro__bolt", intro), { opacity: 0, scale: 1.4, duration: 0.4, ease: "power3.in" }, "<")
      .to(intro, { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, "-=0.2")
      .add(function () { heroTL.play(); }, "-=0.55");
  }
  if (intro) {
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(playIntro); } else { playIntro(); }
  } else { heroTL.play(); }

  /* ---------- 1 · hero scrub ---------- */
  gsap.timeline({
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  })
    .fromTo("[data-hero-bg]", { scale: 1.12, yPercent: 0 }, { scale: 1, yPercent: 8, ease: "none" }, 0)
    .to("[data-hero-grid]", { yPercent: 30, opacity: 0.2, ease: "none" }, 0)
    .to(".hero__copy", { yPercent: -18, opacity: 0, ease: "none" }, 0.1)
    .to("[data-hero-can]", { yPercent: -60, rotate: 8, scale: 1.12, ease: "none" }, 0);

  if (finePointer) {
    var can = $("[data-hero-can] .can");
    window.addEventListener("pointermove", function (e) {
      var px = e.clientX / window.innerWidth - 0.5;
      var py = e.clientY / window.innerHeight - 0.5;
      gsap.to(can, { rotateY: px * 24, rotateX: -py * 12, transformPerspective: 800, duration: 0.8, ease: "power2.out" });
    }, { passive: true });
  }

  /* ---------- 2 · marquee driven by scroll velocity ---------- */
  $$("[data-marquee]").forEach(function (row) {
    var dir = parseFloat(row.getAttribute("data-marquee")) || 1;
    var track = $(".marquee__track", row);
    var x = 0, base = 0.6, boost = 0, half = 0;
    function measure() { half = track.scrollWidth / 2; }
    measure();
    window.addEventListener("resize", measure);
    ScrollTrigger.create({
      trigger: row, start: "top bottom", end: "bottom top",
      onUpdate: function (self) { boost = gsap.utils.clamp(-14, 14, self.getVelocity() / 120); }
    });
    gsap.ticker.add(function () {
      boost *= 0.92;
      x -= (base + boost) * dir;
      if (half) { x = ((x % half) + half) % half; }
      track.style.transform = "translate3d(" + (-x) + "px,0,0)";
    });
  });

  /* ---------- 3 · manifesto cross-fade ---------- */
  var lines = $$("[data-line]");
  var manTL = gsap.timeline({
    scrollTrigger: { trigger: ".manifesto", start: "top top", end: "bottom bottom", scrub: 0.6 }
  });
  var seg = 1 / lines.length;
  lines.forEach(function (line, i) {
    var at = i * seg;
    if (i === 0) {
      manTL.set(line, { opacity: 1, y: 0, scale: 1 }, 0);
    } else {
      manTL.fromTo(line, { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: seg * 0.45, ease: "power2.out" }, at);
    }
    if (i < lines.length - 1) {
      manTL.to(line, { opacity: 0, y: -40, scale: 1.02, duration: seg * 0.35, ease: "power2.in" }, at + seg * 0.65);
    }
  });
  manTL.to("[data-manifesto-bolt]", { rotate: 12, scale: 1.25, ease: "none", duration: 1 }, 0);

  /* ---------- 4 · flavor rail ---------- */
  var rail = $("[data-rail]");
  var railTL = gsap.timeline({
    scrollTrigger: {
      trigger: ".flavors", start: "top top", end: "bottom bottom", scrub: 0.8,
      invalidateOnRefresh: true,
      onEnter: function () { revealSplit($(".rail__intro [data-split]")); }
    }
  });
  railTL.to(rail, { x: function () { return -(rail.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(rail).paddingRight)); }, ease: "none" });
  $$(".rail__item", rail).forEach(function (item, i) {
    if (i === 0) return;
    gsap.fromTo(item, { opacity: 0.55, y: 30 }, {
      opacity: 1, y: 0, ease: "power2.out",
      scrollTrigger: { trigger: item, containerAnimation: railTL, start: "left 92%", end: "left 55%", scrub: true }
    });
  });

  /* ---------- 5 · the line: sticky product swap ---------- */
  var products = {};
  $$("[data-product]").forEach(function (p) { products[p.getAttribute("data-product")] = p; });
  function activate(key) {
    Object.keys(products).forEach(function (k) { products[k].classList.toggle("is-active", k === key); });
    $$(".step").forEach(function (s) { s.classList.toggle("is-active", s.getAttribute("data-step") === key); });
  }
  $$(".step").forEach(function (step) {
    ScrollTrigger.create({
      trigger: step, start: "top 60%", end: "bottom 40%",
      onEnter: function () { activate(step.getAttribute("data-step")); },
      onEnterBack: function () { activate(step.getAttribute("data-step")); }
    });
  });
  activate("drink");
  gsap.to("[data-line-meter]", {
    scaleY: 1, ease: "none",
    scrollTrigger: { trigger: ".line__steps", start: "top 60%", end: "bottom 60%", scrub: true }
  });
  ScrollTrigger.create({ trigger: ".line__head", start: "top 80%", once: true, onEnter: function () { revealSplit($(".line__head [data-split]")); } });

  /* ---------- 6 · the spot: scale to full bleed ---------- */
  var frame = $("[data-spot-frame]");
  var video = $("[data-spot-video]");
  gsap.timeline({
    scrollTrigger: { trigger: ".spot", start: "top top", end: "bottom bottom", scrub: 0.5 }
  })
    .fromTo(frame, { scale: 0.42, borderRadius: 32 }, { scale: 1, borderRadius: 0, ease: "power1.inOut", duration: 0.6 }, 0)
    .fromTo("[data-spot-copy]", { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.25 }, 0.55);
  ScrollTrigger.create({
    trigger: ".spot", start: "top 80%", end: "bottom 20%",
    onEnter: function () { video.play().catch(function () {}); },
    onEnterBack: function () { video.play().catch(function () {}); },
    onLeave: function () { video.pause(); },
    onLeaveBack: function () { video.pause(); }
  });
  setupSound();

  /* ---------- 7 · the brand: wipe + stagger in ---------- */
  gsap.to("[data-reveal]", {
    clipPath: "inset(0 0 0% 0)", ease: "none",
    scrollTrigger: { trigger: "[data-reveal]", start: "top 90%", end: "bottom 60%", scrub: true }
  });
  gsap.fromTo("[data-reveal] img", { scale: 1.2 }, { scale: 1, ease: "none", scrollTrigger: { trigger: "[data-reveal]", start: "top bottom", end: "bottom top", scrub: true } });
  $$("[data-in]").forEach(function (el) {
    ScrollTrigger.create({
      trigger: el, start: "top 82%", once: true,
      onEnter: function () { el.classList.add("is-in"); var s = $("[data-split]", el); if (s) revealSplit(s); }
    });
  });

  /* ---------- 8 · close: text fills with scroll, spotlight follows pointer ---------- */
  gsap.timeline({
    scrollTrigger: { trigger: ".close", start: "top top", end: "bottom bottom", scrub: 0.4 }
  })
    .fromTo("[data-close-fill]", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", ease: "none", duration: 0.7 }, 0)
    .to("[data-close-actions]", { opacity: 1, y: 0, ease: "power2.out", duration: 0.3 }, 0.55);
  var stage = $("[data-spotlight]");
  if (finePointer && stage) {
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      stage.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(2) + "%");
      stage.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(2) + "%");
    }, { passive: true });
  }

  /* ---------- helpers ---------- */
  function revealSplit(el) {
    if (!el || el.classList.contains("is-revealed")) return;
    el.classList.add("is-revealed");
    var words = splits[el.getAttribute("data-split-id")];
    gsap.fromTo(words, { y: "110%" }, { y: "0%", duration: 0.9, ease: "power4.out", stagger: 0.05, overwrite: true });
  }
  function setupSound() {
    var btn = $("[data-spot-sound]");
    var v = $("[data-spot-video]");
    if (!btn || !v) return;
    btn.addEventListener("click", function () {
      v.muted = !v.muted;
      btn.setAttribute("aria-pressed", String(!v.muted));
      btn.textContent = v.muted ? "Sound on" : "Sound off";
      if (v.paused) v.play().catch(function () {});
    });
  }
  function setupProductsFallback() {
    $$("[data-product]").forEach(function (p) { p.classList.add("is-active"); });
  }

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
