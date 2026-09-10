/* NEON FUEL · scroll engine
   Lenis for smooth scroll, GSAP ScrollTrigger for pinned acts. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- product artwork ----------
     Drawn from the NEON FUEL product photography: the blue and lime bodies,
     the bolt badge closing the wordmark, the ENERGY DRINK bar, and the
     ENERGY / FOCUS / ENDURANCE trio beneath it. */
  var FLAVORS = {
    ebr: {
      short: "Electric Blue Raspberry",
      body: "#1c6fd6", bodyDeep: "#0f4ba3", bodyLight: "#4a9bf0",
      flavorInk: "#c8e82a", tagInk: "#f5178f",
      barFill: "#c8e82a", barInk: "#0f4ba3",
      fruit: "#f5178f", fruitLine: "#c8e82a", spark: "#c8e82a", ribbon: "#f5178f"
    },
    lb: {
      short: "Lemon Blueberry",
      body: "#1668d6", bodyDeep: "#0d47a0", bodyLight: "#4695f0",
      flavorInk: "#ffe81c", tagInk: "#ffe81c",
      barFill: "#ffe81c", barInk: "#0d47a0",
      fruit: "#ffe81c", fruitLine: "#38c6f4", spark: "#ffe81c", ribbon: "#ffe81c"
    },
    bb: {
      short: "Berry Blast",
      body: "#c2de35", bodyDeep: "#9dc018", bodyLight: "#dcf065",
      flavorInk: "#e8127e", tagInk: "#e8127e",
      barFill: "#e8127e", barInk: "#dcf065",
      fruit: "#e8127e", fruitLine: "#e8127e", spark: "#e8127e", ribbon: "#e8127e"
    }
  };

  function sparks(f) {
    return '<g fill="' + f.spark + '">' +
      '<path d="M60 232 51 246h5l-2 10 9-14h-5z"/>' +
      '<path d="M146 230 137 244h5l-2 10 9-14h-5z"/>' +
      '<path d="M62 288 55 300h4l-2 8 7-12h-4z"/>' +
      '<path d="M144 286 137 298h4l-2 8 7-12h-4z"/></g>';
  }
  function ribbons(f) {
    return '<g fill="none" stroke="' + f.ribbon + '" stroke-width="6" stroke-linecap="round">' +
      '<path d="M40 264q9-9 18 0t18 0"/><path d="M124 264q9-9 18 0t18 0"/></g>';
  }
  function berry(cx, cy, r, f) {
    // a raspberry: clustered drupelets with a leaf
    var o = '<g transform="translate(' + cx + ' ' + cy + ')">';
    var rows = [[-1, 0, 1], [-1.5, -0.5, 0.5, 1.5], [-1, 0, 1], [-0.5, 0.5]];
    for (var i = 0; i < rows.length; i++)
      for (var j = 0; j < rows[i].length; j++)
        o += '<circle cx="' + (rows[i][j] * r * 0.95).toFixed(1) + '" cy="' + ((i - 1.2) * r * 0.85).toFixed(1) + '" r="' + r * 0.52 + '"/>';
    return o + '<path d="M' + (-r * 0.4) + ' ' + (-r * 2.0) + ' q' + r * 0.4 + ' -' + r * 0.8 + ' ' + r * 0.9 + ' -' + r * 0.1 + ' q-' + r * 0.5 + ' 0 -' + r * 0.9 + ' ' + r * 0.1 + 'Z"/></g>';
  }
  function fruitArt(key, f) {
    if (key === "ebr") {
      return '<g transform="translate(100 262)" fill="' + f.fruit + '" stroke="' + f.fruitLine + '" stroke-width="4">' +
        '<circle cx="0" cy="-26" r="10.5"/><circle cx="-16" cy="-12" r="10.5"/><circle cx="16" cy="-12" r="10.5"/>' +
        '<circle cx="-24" cy="4" r="10.5"/><circle cx="0" cy="2" r="10.5"/><circle cx="24" cy="4" r="10.5"/>' +
        '<circle cx="-14" cy="21" r="10.5"/><circle cx="14" cy="21" r="10.5"/>' +
        '<path d="M-6 -41 Q0 -52 8 -43 Q2 -44 -6 -41Z" fill="' + f.fruitLine + '" stroke="none"/></g>';
    }
    if (key === "lb") {
      return '<g transform="translate(100 262)">' +
        '<circle cx="24" cy="2" r="24" fill="' + f.fruit + '" stroke="#ffffff" stroke-width="3"/>' +
        '<g stroke="#ffffff" stroke-width="2.6" opacity=".92">' +
          '<line x1="24" y1="-21" x2="24" y2="25"/><line x1="1" y1="2" x2="47" y2="2"/>' +
          '<line x1="8" y1="-14" x2="40" y2="18"/><line x1="40" y1="-14" x2="8" y2="18"/></g>' +
        '<circle cx="-25" cy="11" r="14.5" fill="' + f.body + '" stroke="' + f.fruitLine + '" stroke-width="4"/>' +
        '<circle cx="-2" cy="21" r="12" fill="' + f.body + '" stroke="' + f.fruitLine + '" stroke-width="4"/>' +
        '<path d="M-16 -16 q11 -17 26 -8 q-15 2 -26 8Z" fill="' + f.fruitLine + '"/>' +
        '<path d="M-4 -22 q15 -13 28 -3 q-17 -2 -28 3Z" fill="' + f.fruitLine + '"/></g>';
    }
    return '<g fill="' + f.fruit + '">' + berry(76, 250, 11, f) + berry(124, 247, 10.5, f) + berry(100, 281, 12, f) + '</g>';
  }
  function droplets(seed) {
    var s = seed, out = '<g fill="#ffffff" opacity=".18">';
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < 52; i++)
      out += '<circle cx="' + (34 + rnd() * 132).toFixed(1) + '" cy="' + (48 + rnd() * 318).toFixed(1) + '" r="' + (0.8 + rnd() * 1.8).toFixed(1) + '"/>';
    return out + '</g>';
  }

  function canSVG(key) {
    var f = FLAVORS[key] || FLAVORS.ebr;
    var id = "cg-" + key;
    var A = 'font-family="Archivo, system-ui, sans-serif"';
    return '<svg viewBox="0 0 200 400" role="img" aria-label="NEON FUEL ' + f.short + ', 16 fluid ounce energy drink can">' +
      '<defs><linearGradient id="' + id + '" x1="0" x2="1">' +
        '<stop offset="0" stop-color="' + f.bodyDeep + '"/><stop offset=".2" stop-color="' + f.bodyLight + '"/>' +
        '<stop offset=".52" stop-color="' + f.body + '"/><stop offset="1" stop-color="' + f.bodyDeep + '"/>' +
      '</linearGradient></defs>' +
      '<ellipse cx="100" cy="384" rx="62" ry="9" fill="rgba(0,0,0,.42)"/>' +
      '<path d="M30 62 q0-17 13-21 q57-8 114 0 q13 4 13 21 v272 q0 17-13 21 q-57 8-114 0 q-13-4-13-21Z" fill="url(#' + id + ')"/>' +
      droplets(key.charCodeAt(0) * 7919) +
      '<ellipse cx="100" cy="45" rx="70" ry="14" fill="#c2ccd9"/>' +
      '<ellipse cx="100" cy="42" rx="70" ry="14" fill="url(#can-rim)"/>' +
      '<ellipse cx="100" cy="42" rx="58" ry="10.5" fill="#a7b1c0"/>' +
      '<ellipse cx="100" cy="43.5" rx="49" ry="8" fill="#8790a1"/>' +
      '<rect x="87" y="37" width="27" height="8" rx="4" fill="#e2e8f3"/>' +
      '<path d="M36 370 q64 9 128 0 v2 q0 13-13 17 q-51 7-102 0 q-13-4-13-17Z" fill="#b4bdcb"/>' +
      '<text x="100" y="88" text-anchor="middle" ' + A + ' font-weight="800" font-style="italic" font-size="14.5" fill="' + f.flavorInk + '">' + f.short + '</text>' +
      '<text x="100" y="142" text-anchor="middle" ' + A + ' font-weight="900" font-size="42" letter-spacing="-1.5" fill="#ffffff">NEON</text>' +
      '<text x="94" y="187" text-anchor="middle" ' + A + ' font-weight="900" font-size="42" letter-spacing="-1.5" fill="#ffffff">FUEL</text>' +
      '<g data-badge><circle cx="150" cy="173" r="14" fill="none" stroke="' + f.flavorInk + '" stroke-width="4"/>' +
      '<path d="M153 163 144 176h5l-2 10 10-14h-5z" fill="' + f.flavorInk + '"/></g>' +
      '<text x="100" y="212" text-anchor="middle" ' + A + ' font-weight="800" font-size="16" fill="' + f.tagInk + '">Fuel What’s Next.</text>' +
      ribbons(f) + sparks(f) + fruitArt(key, f) +
      '<rect x="38" y="298" width="124" height="22" rx="7" fill="' + f.barFill + '"/>' +
      '<text x="100" y="313.5" text-anchor="middle" ' + A + ' font-weight="900" font-size="12" letter-spacing="0.6" fill="' + f.barInk + '">ENERGY DRINK</text>' +
      '<rect x="38" y="320" width="124" height="28" rx="6" fill="' + f.barFill + '" opacity=".2"/>' +
      '<g stroke="' + f.barFill + '" stroke-width="1" opacity=".65"><line x1="79" y1="324" x2="79" y2="344"/><line x1="121" y1="324" x2="121" y2="344"/></g>' +
      '<g fill="' + f.barFill + '">' +
        '<path d="M61 326 55.5 335h3.2l-1.2 5.4 5.7-7.6h-3.2z"/>' +
        '<circle cx="100" cy="331" r="4.4" fill="none" stroke="' + f.barFill + '" stroke-width="1.5"/><circle cx="100" cy="331" r="1.3"/>' +
        '<g transform="translate(141 331)"><circle cx="1.5" cy="-5.5" r="1.9"/>' +
          '<path d="M-2 -3 l4-1 3 2 2 3-1.4 1-1.8-2.2-2.2 1.2 1.6 2.6-1 4.4-1.6-.4.8-3.6-3.4-3z"/></g>' +
        '<g ' + A + ' font-weight="800" font-size="5.6" letter-spacing="0.2" text-anchor="middle">' +
          '<text x="59" y="345">ENERGY</text><text x="100" y="345">FOCUS</text><text x="141" y="345">ENDURANCE</text></g>' +
      '</g>' +
      '<text x="100" y="356" text-anchor="middle" ' + A + ' font-weight="700" font-size="7.6" fill="' + f.barFill + '">Powered by SterlingCreations.Ai</text>' +
      '<text x="100" y="366" text-anchor="middle" ' + A + ' font-weight="700" font-size="7.2" fill="#ffffff" opacity=".9">16 FL OZ (473 mL)</text>' +
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

  // The real product photography, served from the brand CDN. The drawn can
  // renders first and the photograph replaces it only once it has actually
  // loaded, so a blocked or slow CDN leaves a complete can on screen rather
  // than a broken image.
  var PHOTO = {
    lb:  "https://sterlingcdn.b-cdn.net/neonfuel/NEON-FUEL-Lemon-Blueberry-Main-Product-Shot-transparentback.png",
    ebr: "https://sterlingcdn.b-cdn.net/neonfuel/NEON-FUEL-Main-Product-Shot-ChatGPT-Image-Apr-22%2C-2026%2C-08_16_51-PM-transparentback.png",
    bb:  "https://sterlingcdn.b-cdn.net/neonfuel/NEON-FUEL-Main-Product-Shot-transparentback.png"
  };
  var PHOTO_ALT = {
    ebr: "NEON FUEL Electric Blue Raspberry, 16 fluid ounce can",
    lb:  "NEON FUEL Lemon Blueberry, 16 fluid ounce can",
    bb:  "NEON FUEL Berry Blast, 16 fluid ounce can"
  };
  $$("[data-can]").forEach(function (el) {
    var key = el.getAttribute("data-can");
    el.innerHTML = canSVG(key);
    var url = PHOTO[key];
    if (!url) return;
    var img = new Image();
    img.decoding = "async";
    img.alt = PHOTO_ALT[key] || "NEON FUEL can";
    img.className = "can__photo";
    img.onload = function () {
      el.innerHTML = "";
      el.appendChild(img);
      el.classList.add("can--photo");
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    img.src = url;
  });
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

  /* ---------- 3 · manifesto reel ---------- */
  // Each statement gets its own full-height panel and the reel moves by exactly
  // one panel per beat. Cross-fading them in a shared cell was unreadable: a
  // headline that wraps to two lines lands directly on top of the next one.
  var lines = $$("[data-line]");
  var reel = $("[data-reel]");
  var panelH = function () { return $(".manifesto__stage").offsetHeight; };
  var manTL = gsap.timeline({
    scrollTrigger: {
      trigger: ".manifesto", start: "top top", end: "bottom bottom",
      scrub: 0.6, invalidateOnRefresh: true
    }
  });
  for (var mi = 0; mi < lines.length - 1; mi++) {
    (function (step) {
      manTL.to(reel, {
        y: function () { return -step * panelH(); },
        duration: 0.55, ease: "power2.inOut"
      });
      manTL.to({}, { duration: 0.45 });        // dwell on the statement
    })(mi + 1);
  }
  manTL.to("[data-manifesto-bolt]", { rotate: 12, scale: 1.25, ease: "none", duration: manTL.duration() || 1 }, 0);

  /* ---------- 4 · flavor rail ---------- */
  var rail = $("[data-rail]");
  var railTL = gsap.timeline({
    scrollTrigger: {
      trigger: ".flavors", start: "top top", end: "bottom bottom", scrub: 0.8,
      invalidateOnRefresh: true,
      onEnter: function () { revealSplit($(".rail__intro [data-split]")); }
    }
  });
  // The pan waits before it moves. Without the hold the intro heading slides
  // out of frame before the reader has finished the first line of it.
  railTL.to(rail, {
    x: function () { return -(rail.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(rail).paddingRight)); },
    ease: "none", duration: 0.86
  }, 0.14);
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
    .fromTo("[data-spot-scrim]", { opacity: 0 }, { opacity: 1, ease: "power1.out", duration: 0.22 }, 0.36)
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
