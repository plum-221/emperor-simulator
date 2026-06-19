/* ===================================================================
   assets.js —— 程序化 SVG 素材包（人物立绘 / 状态图标 / 印章）
   全部以字符串形式生成，内联到 DOM，不依赖任何外部图片。
   ART.portrait(role) -> svg字符串
   ART.icon(stat)     -> svg字符串
   =================================================================== */
const ART = (() => {

  // ---- 调色 ----
  const SKIN = "#f0cba0", SKIN_SH = "#dcae82";
  const LINE = "#3a2418";

  // 头部 + 五官（公共脸），beard: 0无 1短须 2长须，brow 眉形
  function face(beard=1, browAngle=0){
    return `
      <ellipse cx="100" cy="118" rx="42" ry="46" fill="${SKIN}"/>
      <path d="M62 120 q-6 14 6 22 q-10 -2 -12 -16z" fill="${SKIN_SH}"/>
      <ellipse cx="84" cy="116" rx="6" ry="7" fill="#fff"/>
      <ellipse cx="116" cy="116" rx="6" ry="7" fill="#fff"/>
      <circle cx="85" cy="117" r="3" fill="${LINE}"/>
      <circle cx="115" cy="117" r="3" fill="${LINE}"/>
      <path d="M74 ${104+browAngle} q10 -6 20 ${-2-browAngle}" stroke="${LINE}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M106 ${104-browAngle} q10 ${-4+browAngle} 20 ${2+browAngle}" stroke="${LINE}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M97 124 q3 6 6 0" stroke="${SKIN_SH}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M90 140 q10 6 20 0" stroke="${LINE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      ${beard===1?`<path d="M82 150 q18 16 36 0 q-6 14 -18 16 q-12 -2 -18 -16z" fill="#4a3526"/>`:""}
      ${beard===2?`<path d="M80 148 q20 18 40 0 q-2 30 -20 40 q-18 -10 -20 -40z" fill="#4a3526"/>`:""}
    `;
  }

  // 身体/朝服领口
  function robe(color, collar="#f4ead2"){
    return `
      <path d="M44 200 q4 -50 56 -52 q52 2 56 52z" fill="${color}"/>
      <path d="M84 152 l16 26 l16 -26 q-16 14 -32 0z" fill="${collar}"/>
      <path d="M100 178 l0 22" stroke="rgba(0,0,0,.18)" stroke-width="3"/>
    `;
  }

  // 各种官帽 / 头饰
  const HATS = {
    // 乌纱帽（展脚）—— 文官
    wushaMao:`<g><rect x="70" y="62" width="60" height="26" rx="12" fill="#222"/><rect x="78" y="50" width="44" height="22" rx="10" fill="#2c2c2c"/><rect x="30" y="70" width="40" height="9" rx="4" fill="#222"/><rect x="130" y="70" width="40" height="9" rx="4" fill="#222"/><circle cx="100" cy="56" r="4" fill="${"#d9b65f"}"/></g>`,
    // 冕旒 —— 皇帝
    mian:`<g><rect x="62" y="54" width="76" height="16" rx="3" fill="#1d1d1d"/><rect x="58" y="48" width="84" height="10" rx="3" fill="#3a2a10"/><rect x="58" y="44" width="84" height="6" rx="2" fill="#d9b65f"/>
      ${[68,82,96,110,124,138].map(x=>`<line x1="${x}" y1="58" x2="${x}" y2="76" stroke="#d9b65f" stroke-width="2"/><circle cx="${x}" cy="78" r="3" fill="#c0392b"/><circle cx="${x}" cy="70" r="2.4" fill="#f3d784"/>`).join("")}</g>`,
    // 凤冠 —— 皇后
    fengGuan:`<g><path d="M64 70 q36 -34 72 0z" fill="#b3261e"/><path d="M64 70 q36 -22 72 0z" fill="#d9b65f"/><circle cx="100" cy="44" r="7" fill="#f3d784"/><circle cx="78" cy="54" r="5" fill="#c0392b"/><circle cx="122" cy="54" r="5" fill="#c0392b"/><path d="M70 70 l-6 16 M130 70 l6 16" stroke="#d9b65f" stroke-width="2"/><circle cx="64" cy="88" r="3" fill="#f3d784"/><circle cx="136" cy="88" r="3" fill="#f3d784"/></g>`,
    // 头盔（红缨）—— 武将
    helmet:`<g><path d="M62 80 q38 -46 76 0z" fill="#6b7079"/><path d="M62 80 q38 -34 76 0z" fill="#8a909a"/><rect x="92" y="30" width="16" height="14" rx="3" fill="#c0392b"/><path d="M100 16 q-10 16 0 24 q10 -8 0 -24z" fill="#c0392b"/><rect x="60" y="78" width="80" height="8" rx="4" fill="#5a5f66"/><circle cx="100" cy="64" r="5" fill="#d9b65f"/></g>`,
    // 软幞头 —— 太监
    softHat:`<g><path d="M70 70 q30 -26 60 0 q-2 -16 -30 -16 q-28 0 -30 16z" fill="#3a2f2a"/><rect x="84" y="50" width="32" height="14" rx="7" fill="#4a3d36"/></g>`,
    // 道冠 —— 钦天监 / 方士
    daoGuan:`<g><rect x="84" y="42" width="32" height="34" rx="6" fill="#2c3e50"/><rect x="80" y="70" width="40" height="8" rx="4" fill="#1c2b38"/><path d="M96 30 l8 12 l8 -12z" fill="#d9b65f"/><circle cx="100" cy="56" r="5" fill="#d9b65f"/></g>`,
    // 番邦皮帽 —— 使臣
    furHat:`<g><path d="M66 72 q34 -40 68 0z" fill="#6b4a2a"/><path d="M64 70 q36 -10 72 0 l0 10 q-36 -8 -72 0z" fill="#3d2a14"/><path d="M96 26 l8 14 l8 -14z" fill="#c0392b"/></g>`,
    // 布巾 —— 百姓
    cloth:`<g><path d="M66 78 q34 -36 68 0 q-4 -20 -34 -20 q-30 0 -34 20z" fill="#9a8a6a"/><path d="M132 70 l14 8 l-12 4z" fill="#9a8a6a"/></g>`
  };

  // 角色配置表：帽子 + 朝服色 + 胡须 + 眉
  const ROLES = {
    emperor:   {hat:"mian",     robe:"#c8102e", beard:2, brow:0},
    chancellor:{hat:"wushaMao", robe:"#5b3a8a", beard:2, brow:1},
    general:   {hat:"helmet",   robe:"#8a3a2a", beard:1, brow:2},
    finance:   {hat:"wushaMao", robe:"#2e6e5a", beard:1, brow:0},
    censor:    {hat:"wushaMao", robe:"#34506e", beard:1, brow:2},
    eunuch:    {hat:"softHat",  robe:"#6a4a7a", beard:0, brow:1},
    empress:   {hat:"fengGuan", robe:"#c0397a", beard:0, brow:0},
    consort:   {hat:"fengGuan", robe:"#d46a9a", beard:0, brow:0},
    astrologer:{hat:"daoGuan",  robe:"#2c3e6e", beard:2, brow:0},
    envoy:     {hat:"furHat",   robe:"#7a5a2a", beard:1, brow:2},
    peasant:   {hat:"cloth",    robe:"#7a6a4a", beard:1, brow:0},
    prince:    {hat:"wushaMao", robe:"#c8a02e", beard:0, brow:0},
    relative:  {hat:"wushaMao", robe:"#8a6a2a", beard:1, brow:1},
    monk:      {hat:"cloth",    robe:"#c87a2a", beard:0, brow:0},
    self:      {hat:"mian",     robe:"#c8102e", beard:2, brow:0}
  };

  function portrait(role){
    const r = ROLES[role] || ROLES.chancellor;
    const bg = `<defs><radialGradient id="bg" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stop-color="#fff7e6"/><stop offset="100%" stop-color="#e9d6ad"/>
      </radialGradient></defs>`;
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      ${bg}<rect width="200" height="200" fill="url(#bg)"/>
      ${robe(r.robe)}
      ${face(r.beard, r.brow)}
      ${HATS[r.hat]||""}
    </svg>`;
  }

  // ---- 四维状态图标 ----
  const ICONS = {
    people:`<svg viewBox="0 0 40 40"><circle cx="14" cy="13" r="6" fill="#5aa06a"/><path d="M4 34 q10 -14 20 0z" fill="#5aa06a"/><circle cx="28" cy="16" r="5" fill="#7cc08a"/><path d="M20 34 q8 -12 16 0z" fill="#7cc08a"/></svg>`,
    treasury:`<svg viewBox="0 0 40 40"><ellipse cx="20" cy="30" rx="13" ry="8" fill="#c79b3a"/><ellipse cx="20" cy="22" rx="13" ry="8" fill="#d9b65f"/><ellipse cx="20" cy="22" rx="13" ry="5" fill="#f3d784"/><text x="20" y="26" font-size="9" text-anchor="middle" fill="#7a5a14" font-family="serif">金</text></svg>`,
    military:`<svg viewBox="0 0 40 40"><path d="M20 4 l16 26 q-16 8 -32 0z" fill="#c0563a"/><path d="M20 4 l0 26" stroke="#7a1812" stroke-width="2"/><rect x="17" y="28" width="6" height="8" fill="#7a3a2a"/></svg>`,
    court:`<svg viewBox="0 0 40 40"><rect x="6" y="30" width="28" height="5" fill="#5b82b8"/><path d="M6 18 l14 -10 l14 10z" fill="#7a9bd0"/><rect x="9" y="18" width="4" height="12" fill="#5b82b8"/><rect x="18" y="18" width="4" height="12" fill="#5b82b8"/><rect x="27" y="18" width="4" height="12" fill="#5b82b8"/></svg>`
  };

  function icon(stat){ return ICONS[stat] || ""; }

  return { portrait, icon, ROLES };
})();
