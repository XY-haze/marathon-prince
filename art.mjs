/* ==========================================================================
   《马拉松王子》资料站 — 自绘 SVG 美术（全部本地生成，无外部图片依赖）
   ========================================================================== */

/** 通用 SVG 包装 */
const svg = (w, h, inner, attrs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${attrs}>${inner}</svg>`;

/** 跑步人形图标（火柴人式 pictogram，可缩放 / 复用） */
export function runner(cx, cy, s = 1, color = "#eaf6ff", opacity = 1, animClass = "runner") {
  return `<g class="${animClass}" transform="translate(${cx} ${cy}) scale(${s})" opacity="${opacity}"
      fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="3" cy="-39" r="7" fill="${color}" stroke="none"/>
    <path d="M0 -30 L3 -10"/>
    <path d="M1 -27 L14 -32 L22 -23"/>
    <path d="M1 -26 L-12 -21 L-19 -11"/>
    <path d="M3 -10 L15 -3 L12 9"/>
    <path d="M3 -10 L-9 -1 L-6 8"/>
  </g>`;
}

/** 火焰（马拉松圣火），可缩放 */
export function flame(cx, cy, s = 1, outer = "#ff9f43", inner = "#ffd98a", animClass = "flame") {
  return `<g class="${animClass}" transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M0 0 C -18 -16 -13 -34 0 -52 C 13 -34 18 -16 0 0 Z" fill="${outer}"/>
    <path d="M0 -6 C -9 -16 -7 -26 0 -36 C 7 -26 9 -16 0 -6 Z" fill="${inner}"/>
  </g>`;
}

/** 海鸥 */
const gull = (x, y, s = 1, color = "#dff2fb", delay = 0) =>
  `<g class="gull" transform="translate(${x} ${y}) scale(${s})" style="animation-delay:${delay}s">
    <path d="M-11 0 C -6 -7 -3 -7 0 -1 C 3 -7 6 -7 11 0" fill="none" stroke="${color}"
      stroke-width="2.4" stroke-linecap="round" opacity=".72"/>
  </g>`;

/* ------------------------------------------------------------------ 标识 */

export function logoMark(size = 30) {
  return svg(
    64,
    64,
    `<defs>
       <linearGradient id="lgFlame" x1="0" y1="1" x2="0" y2="0">
         <stop offset="0" stop-color="#ef5f18"/><stop offset="1" stop-color="#ffc94d"/>
       </linearGradient>
     </defs>
     <circle cx="32" cy="32" r="28" fill="none" stroke="#ffc94d" stroke-width="3.4" stroke-dasharray="7 6" opacity=".95"/>
     <circle cx="32" cy="32" r="21" fill="none" stroke="#2ea3d8" stroke-width="1.6" opacity=".65"/>
     <g transform="translate(32 45) scale(.62)">
       <path d="M0 0 C -18 -16 -13 -34 0 -52 C 13 -34 18 -16 0 0 Z" fill="url(#lgFlame)"/>
       <path d="M0 -6 C -9 -16 -7 -26 0 -36 C 7 -26 9 -16 0 -6 Z" fill="#fff3d0" opacity=".92"/>
     </g>`,
    `width="${size}" height="${size}" role="img" aria-label="马拉松王子标识"`
  );
}

export function favicon() {
  return svg(
    32,
    32,
    `<rect width="32" height="32" rx="8" fill="#0a2d4f"/>
     <circle cx="16" cy="16" r="12" fill="none" stroke="#ffc94d" stroke-width="2" stroke-dasharray="3.5 3"/>
     <g transform="translate(16 24) scale(.34)">
       <path d="M0 0 C -18 -16 -13 -34 0 -52 C 13 -34 18 -16 0 0 Z" fill="#ff9f43"/>
       <path d="M0 -6 C -9 -16 -7 -26 0 -36 C 7 -26 9 -16 0 -6 Z" fill="#ffe9b0"/>
     </g>`
  );
}

/* ------------------------------------------------------------------ 首屏场景 */

export function heroArt() {
  const buildings = [
    [36, 470, 44, -74], [86, 470, 32, -44], [124, 470, 56, -100], [186, 470, 38, -60],
    [230, 470, 30, -36], [266, 470, 64, -118], [336, 470, 42, -68], [384, 470, 34, -50],
    [424, 470, 52, -92], [482, 470, 28, -38], [516, 470, 46, -72], [568, 470, 36, -56],
    [610, 470, 58, -106], [674, 470, 32, -46], [712, 470, 44, -80], [762, 470, 26, -34],
    [794, 470, 40, -62], [840, 470, 30, -42],
  ]
    .map(
      ([x, y, w, h]) =>
        `<rect x="${x}" y="${y + h}" width="${w}" height="${-h}" rx="3" fill="#061c33" opacity=".8"/>`
    )
    .join("");

  const windows = [
    [50, 402, 4], [62, 422, 3], [140, 388, 4], [154, 412, 3], [280, 368, 4], [298, 398, 3],
    [440, 394, 4], [456, 416, 3], [626, 378, 4], [644, 406, 3], [726, 396, 3],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffc94d" opacity=".52"/>`)
    .join("");

  return svg(
    1600,
    700,
    `<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="#04182c"/>
        <stop offset="0.52" stop-color="#0a2d4f"/>
        <stop offset="1" stop-color="#14507f"/>
      </linearGradient>
      <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#fff3d0" stop-opacity=".95"/>
        <stop offset="0.42" stop-color="#ffc94d" stop-opacity=".7"/>
        <stop offset="1" stop-color="#ff9f43" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#0d3a61"/>
        <stop offset="0.55" stop-color="#164f7d"/>
        <stop offset="1" stop-color="#1f6aa8"/>
      </linearGradient>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0d3357"/>
        <stop offset="1" stop-color="#061c33"/>
      </linearGradient>
    </defs>

    <rect width="1600" height="700" fill="url(#sky)"/>
    <circle cx="655" cy="238" r="235" fill="url(#sun)"/>
    <circle cx="655" cy="238" r="62" fill="#ffe0a0" opacity=".42"/>
    <circle cx="655" cy="238" r="96" fill="none" stroke="#ffe9b0" stroke-width="1.6" opacity=".28"/>

    ${gull(452, 148, 1.15, "#dff2fb", 0)}
    ${gull(548, 104, 0.9, "#dff2fb", 1.3)}
    ${gull(742, 162, 1, "#dff2fb", 2.1)}

    <ellipse cx="200" cy="176" rx="200" ry="26" fill="#ffffff" opacity=".055"/>
    <ellipse cx="470" cy="118" rx="150" ry="20" fill="#ffffff" opacity=".045"/>

    ${buildings}
    ${windows}

    <rect x="0" y="470" width="1600" height="230" fill="url(#sea)"/>
    <path d="M0 500 Q 200 488 400 500 T 800 500 T 1200 500 T 1600 500" fill="none" stroke="#2ea3d8" stroke-width="2" opacity=".3"/>
    <path d="M0 542 Q 260 528 520 542 T 1040 542 T 1600 542" fill="none" stroke="#7fd0ef" stroke-width="1.6" opacity=".18"/>
    <path d="M0 596 Q 300 582 600 596 T 1200 596 T 1600 596" fill="none" stroke="#2ea3d8" stroke-width="1.6" opacity=".13"/>

    <path d="M-60 700 C 280 612 640 636 1000 556 C 1240 502 1460 470 1700 452"
      fill="none" stroke="url(#road)" stroke-width="94" stroke-linecap="round"/>
    <path d="M-60 700 C 280 612 640 636 1000 556 C 1240 502 1460 470 1700 452"
      fill="none" stroke="#ffe9b0" stroke-width="3.4" stroke-dasharray="22 32" opacity=".8" class="track-dash"/>
    <path d="M-60 700 C 280 612 640 636 1000 556 C 1240 502 1460 470 1700 452"
      fill="none" stroke="#7fd0ef" stroke-width="1.2" opacity=".3" stroke-dasharray="2 12"/>

    ${flame(158, 626, 0.92, "#ff9f43", "#ffe9b0")}
    <rect x="137" y="620" width="42" height="50" rx="7" fill="#0a2d4f" stroke="#ffc94d" stroke-width="2" opacity=".92"/>
    <rect x="146" y="627" width="24" height="11" rx="3" fill="#ffc94d" opacity=".72"/>

    ${runner(452, 646, 1.55, "#eaf6ff", 0.96)}
    ${runner(722, 596, 1, "#dff2fb", 0.55, "runner-static")}
    ${runner(892, 552, 0.85, "#dff2fb", 0.38, "runner-static")}`,

    `preserveAspectRatio="xMidYMid slice" role="img" aria-label="厦门海滨马拉松赛道插画：赛道、圣火、奔跑的少年与城市天际线"`
  );
}

/* ------------------------------------------------------------------ 海报 */

export function poster() {
  return svg(
    600,
    800,
    `<defs>
      <linearGradient id="pbg" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#09253f"/>
        <stop offset="0.5" stop-color="#0a2d4f"/>
        <stop offset="1" stop-color="#12456f"/>
      </linearGradient>
      <radialGradient id="pglow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ffc94d" stop-opacity=".8"/>
        <stop offset="1" stop-color="#ff9f43" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="pring" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffc94d"/><stop offset="1" stop-color="#ef5f18"/>
      </linearGradient>
      <linearGradient id="pflame" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#ef5f18"/><stop offset="1" stop-color="#ffe9b0"/>
      </linearGradient>
    </defs>

    <rect width="600" height="800" fill="url(#pbg)"/>
    <circle cx="300" cy="316" r="248" fill="url(#pglow)"/>
    <circle cx="300" cy="316" r="182" fill="none" stroke="url(#pring)" stroke-width="6" stroke-dasharray="18 14" opacity=".92"/>
    <circle cx="300" cy="316" r="150" fill="none" stroke="#2ea3d8" stroke-width="2" opacity=".5"/>
    <circle cx="300" cy="316" r="204" fill="none" stroke="#7fd0ef" stroke-width="1.4" opacity=".3"/>

    <g transform="translate(300 372) scale(1.9)">
      <path d="M0 0 C -18 -16 -13 -34 0 -52 C 13 -34 18 -16 0 0 Z" fill="url(#pflame)"/>
      <path d="M0 -6 C -9 -16 -7 -26 0 -36 C 7 -26 9 -16 0 -6 Z" fill="#fff6dd" opacity=".95"/>
    </g>

    <path d="M-20 700 C 150 660 330 686 470 640 C 540 618 590 604 640 596"
      fill="none" stroke="#0b3357" stroke-width="52" stroke-linecap="round"/>
    <path d="M-20 700 C 150 660 330 686 470 640 C 540 618 590 604 640 596"
      fill="none" stroke="#ffe9b0" stroke-width="3" stroke-dasharray="14 20" opacity=".7" class="track-dash"/>

    ${runner(400, 664, 1.25, "#eaf6ff", 0.95)}

    <text x="300" y="510" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, Source Han Sans SC, sans-serif"
      font-size="72" font-weight="800" fill="#ffffff" letter-spacing="8">马拉松王子</text>
    <text x="300" y="556" text-anchor="middle" font-family="Bahnschrift, Segoe UI, sans-serif"
      font-size="19" font-weight="700" fill="#ffc94d" letter-spacing="9">PRINCE MARATHON</text>
    <text x="300" y="600" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif"
      font-size="17" fill="#9fd8f2" letter-spacing="3">2011 · 全 52 集 · 中国厦门</text>`,

    `role="img" aria-label="马拉松王子海报：马拉松之环与圣火"`
  );
}

/* ------------------------------------------------------------------ 角色徽章 */

export function avatar({ glyph, from, to, motif = "ring", size = 88, id = "x" }) {
  const motifs = {
    ring: `<circle cx="80" cy="80" r="50" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="9 8" opacity=".55"/>`,
    flame: `<g transform="translate(80 128) scale(1.15)" opacity=".6">
        <path d="M0 0 C -18 -16 -13 -34 0 -52 C 13 -34 18 -16 0 0 Z" fill="#fff3d0"/>
      </g>`,
    paw: `<g fill="#ffffff" opacity=".5">
        <ellipse cx="80" cy="126" rx="17" ry="13"/>
        <circle cx="58" cy="104" r="7"/><circle cx="74" cy="98" r="7"/>
        <circle cx="90" cy="98" r="7"/><circle cx="105" cy="106" r="7"/>
      </g>`,
    coral: `<g stroke="#ffffff" stroke-width="3.4" fill="none" opacity=".5" stroke-linecap="round">
        <path d="M80 130 L80 96"/><path d="M80 112 L64 96"/><path d="M80 112 L96 94"/>
        <path d="M80 104 L68 84"/><path d="M80 104 L92 82"/>
      </g>`,
    fan: `<g opacity=".5" fill="none" stroke="#ffffff" stroke-width="3">
        <path d="M52 122 A 46 46 0 0 1 108 122 Z" fill="#ffffff" opacity=".28" stroke="none"/>
        <path d="M52 122 A 46 46 0 0 1 108 122"/><path d="M80 122 L80 78"/>
        <path d="M80 122 L60 90"/><path d="M80 122 L100 90"/>
      </g>`,
    star: `<path d="M80 82 L89 106 L114 106 L94 121 L101 145 L80 130 L59 145 L66 121 L46 106 L71 106 Z"
        fill="#ffffff" opacity=".45"/>`,
    laurel: `<g opacity=".5" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round">
        <path d="M54 132 C 40 110 44 84 62 70"/><path d="M106 132 C 120 110 116 84 98 70"/>
        <path d="M52 112 L38 106"/><path d="M54 94 L40 86"/><path d="M61 78 L50 66"/>
        <path d="M108 112 L122 106"/><path d="M106 94 L120 86"/><path d="M99 78 L110 66"/>
      </g>`,
  };

  return svg(
    160,
    160,
    `<defs>
      <linearGradient id="avg-${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="34" fill="url(#avg-${id})"/>
    ${motifs[motif] || motifs.ring}
    <text x="80" y="84" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, Source Han Sans SC, sans-serif"
      font-size="62" font-weight="800" fill="#ffffff" opacity=".95">${glyph}</text>
    <rect x="0" y="0" width="160" height="160" rx="34" fill="none" stroke="#ffffff" stroke-opacity=".3" stroke-width="2"/>`,
    `width="${size}" height="${size}" role="img" aria-label="${glyph}角色徽章"`
  );
}

/* ------------------------------------------------------------------ 赛道分隔带 */

export function trackRibbon() {
  return svg(
    1200,
    60,
    `<path d="M0 30 H1200" stroke="#10406e" stroke-width="26" stroke-linecap="round" opacity=".12"/>
     <path d="M0 30 H1200" stroke="#ef5f18" stroke-width="2.6" stroke-dasharray="16 22" opacity=".55" class="track-dash"/>`,
    `preserveAspectRatio="none" role="presentation" aria-hidden="true"`
  );
}
