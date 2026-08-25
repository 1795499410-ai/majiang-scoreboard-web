/**
 * 东方手游风装饰组件 —— 全部内联 SVG，零外部资源
 * 作用域限定榜单页（.page-rich）与战报图；工具页保持简洁（D-014）
 */

/** 多层视差场景页头：天空 → 云雾 → 远山 → 楼阁 → 竹林 → 前景 */
export function SceneHeader() {
  return (
    <div className="scene">
      <svg className="scene-svg" viewBox="0 0 390 210" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16281F" />
            <stop offset="42%" stopColor="#274536" />
            <stop offset="78%" stopColor="#3B6A54" />
            <stop offset="100%" stopColor="#52886B" />
          </linearGradient>
          <linearGradient id="sc-mist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FAF8F3" stopOpacity="0" />
            <stop offset="100%" stopColor="#F3EFE4" stopOpacity=".96" />
          </linearGradient>
          <radialGradient id="sc-moon">
            <stop offset="0%" stopColor="#FFF6DA" stopOpacity=".95" />
            <stop offset="55%" stopColor="#F0DFA8" stopOpacity=".35" />
            <stop offset="100%" stopColor="#F0DFA8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sc-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7A3B32" />
            <stop offset="100%" stopColor="#4A211C" />
          </linearGradient>
        </defs>

        <rect width="390" height="210" fill="url(#sc-sky)" />

        {/* 月与光晕 */}
        <circle cx="312" cy="46" r="46" fill="url(#sc-moon)" />
        <circle cx="312" cy="46" r="17" fill="#FFF8E3" opacity=".9" />

        {/* 星点：闪烁错峰 */}
        <g>
          {[[42,26,1.3,.55],[88,44,1,.4],[140,22,1.5,.5],[196,52,1,.35],[248,30,1.3,.45],
            [356,88,1,.32],[64,70,1.1,.3],[118,14,1.2,.42],[168,36,.9,.3],[222,18,1.1,.38],
            [292,64,1,.3],[330,28,1.3,.4],[24,52,1,.28],[152,60,.9,.26],[268,44,1,.34],
            [372,44,1.1,.3],[106,60,.9,.24],[210,70,1,.28]]
            .map(([cx, cy, r, o], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="#FFF8E3" opacity={o}
                className="twinkle" style={{ animationDelay: `${(i % 6) * 0.5}s` }} />
            ))}
        </g>

        {/* 漂浮光尘 */}
        <g className="motes" fill="#FFEFC0">
          {[[70,120,1.4],[150,138,1.1],[228,112,1.3],[300,132,1],[196,150,1.2],[122,158,.9]]
            .map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} opacity=".5"
                style={{ animationDelay: `${i * 1.3}s` }} />
            ))}
        </g>

        {/* 远山三层 */}
        <path d="M0 118 L48 88 L92 110 L146 76 L206 112 L262 86 L326 114 L390 92 L390 210 L0 210 Z" fill="#1C3128" opacity=".5" />
        <path d="M0 132 L44 110 L102 128 L162 100 L224 130 L286 110 L342 132 L390 116 L390 210 L0 210 Z" fill="#152720" opacity=".62" />

        {/* 云雾带 */}
        <g fill="#DCEAE0" opacity=".14">
          <ellipse cx="86" cy="104" rx="66" ry="9" />
          <ellipse cx="268" cy="122" rx="82" ry="10" />
          <ellipse cx="182" cy="92" rx="52" ry="7" />
        </g>

        {/* 主楼阁：双层飞檐 */}
        <g className="scene-pavilion">
          <path d="M195 40 L262 66 L252 71 L195 50 L138 71 L128 66 Z" fill="url(#sc-roof)" />
          <path d="M128 66 Q195 54 262 66 L262 72 Q195 60 128 72 Z" fill="#5E2B24" />
          {/* 夸张飞檐：明显上翘的弧线 + 檐铃 */}
          <path d="M128 67 q-20 -3 -30 -16 q14 6 22 10 q-4 -8 -2 -14 q6 10 14 16 Z" fill="#7A3B32" />
          <path d="M262 67 q20 -3 30 -16 q-14 6 -22 10 q4 -8 2 -14 q-6 10 -14 16 Z" fill="#7A3B32" />
          <circle cx="99" cy="52" r="2.2" fill="#D4AC42" />
          <circle cx="291" cy="52" r="2.2" fill="#D4AC42" />
          <path d="M144 99 q-16 -2 -24 -13 q11 5 18 8 Z" fill="#5E2B24" />
          <path d="M246 99 q16 -2 24 -13 q-11 5 -18 8 Z" fill="#5E2B24" />
          <rect x="168" y="72" width="54" height="8" fill="#3E1B17" />
          <path d="M195 78 L246 98 L238 102 L195 86 L152 102 L144 98 Z" fill="url(#sc-roof)" />
          <rect x="172" y="102" width="46" height="30" fill="#2E1512" />
          {/* 窗棂透光 */}
          <rect x="180" y="108" width="12" height="16" fill="#E8B44A" opacity=".55" />
          <rect x="198" y="108" width="12" height="16" fill="#E8B44A" opacity=".55" />
          {/* 塔尖 */}
          <path d="M195 24 L199 40 L191 40 Z" fill="#B8901F" />
          <circle cx="195" cy="22" r="3" fill="#D4AC42" />
        </g>

        {/* 侧亭 */}
        <g opacity=".82">
          <path d="M62 96 L98 110 L92 113 L62 102 L32 113 L26 110 Z" fill="#4A211C" />
          <rect x="50" y="113" width="24" height="20" fill="#2E1512" />
          <rect x="56" y="118" width="12" height="12" fill="#E8B44A" opacity=".4" />
        </g>

        {/* 灯笼 */}
        <g className="lantern lantern-a">
          <line x1="118" y1="60" x2="118" y2="74" stroke="#3E1B17" strokeWidth="1.5" />
          <ellipse cx="118" cy="83" rx="9" ry="11" fill="#C4402F" />
          <ellipse cx="118" cy="83" rx="9" ry="11" fill="none" stroke="#8E2A1E" strokeWidth="1" />
          <rect x="114" y="71" width="8" height="3" fill="#B8901F" />
          <rect x="114" y="92" width="8" height="3" fill="#B8901F" />
          <path d="M118 95 l0 7" stroke="#E8B44A" strokeWidth="1.5" />
        </g>
        <g className="lantern lantern-b">
          <line x1="272" y1="62" x2="272" y2="76" stroke="#3E1B17" strokeWidth="1.5" />
          <ellipse cx="272" cy="85" rx="8" ry="10" fill="#C4402F" />
          <rect x="268" y="74" width="8" height="3" fill="#B8901F" />
          <rect x="268" y="93" width="8" height="3" fill="#B8901F" />
          <path d="M272 96 l0 6" stroke="#E8B44A" strokeWidth="1.5" />
        </g>

        {/* 竹林：左密右疏 */}
        <g className="bamboo-grove">
          {[[14,28],[30,54],[46,40],[344,36],[362,22],[378,58]].map(([x, top], i) => (
            <g key={i} opacity={i % 2 ? '.62' : '.8'}>
              <path d={`M${x} 210 L${x} ${top}`} stroke="#16281F" strokeWidth="3.5" fill="none" />
              <path d={`M${x} ${top + 32} q${i % 2 ? 16 : -16} -12 ${i % 2 ? 26 : -26} -6`} stroke="#16281F" strokeWidth="2" fill="none" />
              <path d={`M${x} ${top + 68} q${i % 2 ? -14 : 14} -11 ${i % 2 ? -24 : 24} -5`} stroke="#16281F" strokeWidth="2" fill="none" />
              <g stroke="#0E1C15" strokeWidth="2" opacity=".6">
                <path d={`M${x - 4} ${top + 30} L${x + 4} ${top + 30}`} />
                <path d={`M${x - 4} ${top + 66} L${x + 4} ${top + 66}`} />
                <path d={`M${x - 4} ${top + 102} L${x + 4} ${top + 102}`} />
              </g>
            </g>
          ))}
        </g>

        {/* 竹叶簇 */}
        <g fill="#1C3128" opacity=".7">
          <path d="M8 46 q22 -8 34 4 q-20 6 -34 -4 Z" />
          <path d="M18 66 q24 -4 32 10 q-22 2 -32 -10 Z" />
          <path d="M382 40 q-22 -8 -34 4 q20 6 34 -4 Z" />
          <path d="M372 62 q-24 -4 -32 10 q22 2 32 -10 Z" />
        </g>

        {/* 飞鸟 */}
        <g className="birds" stroke="#0E1C15" strokeWidth="1.6" fill="none" opacity=".55">
          <path d="M96 34 q6 -5 12 0 q6 -5 12 0" />
          <path d="M244 24 q5 -4 10 0 q5 -4 10 0" />
        </g>

        {/* 底部雾化衔接页面底色 */}
        <rect y="150" width="390" height="60" fill="url(#sc-mist)" />
      </svg>
      <div className="scene-fade" />
    </div>
  );
}

/**
 * 紧凑场景页头 —— 二级页面用，高度约为榜单页的一半。
 * variant 决定主体元素：players=庭院石桌 / ai=竹屋书案 / me=远山孤亭
 */
export function MiniScene({ variant = 'players' }) {
  return (
    <div className="mini-scene">
      <svg className="mini-svg" viewBox="0 0 390 108" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id={`ms-sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B3128" />
            <stop offset="58%" stopColor="#325843" />
            <stop offset="100%" stopColor="#4E8367" />
          </linearGradient>
          <linearGradient id={`ms-fade-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FAF8F3" stopOpacity="0" />
            <stop offset="100%" stopColor="#FAF8F3" stopOpacity=".95" />
          </linearGradient>
        </defs>

        <rect width="390" height="108" fill={`url(#ms-sky-${variant})`} />

        {/* 远山 */}
        <path d="M0 62 L56 42 L108 58 L166 36 L228 60 L292 40 L348 60 L390 46 L390 108 L0 108 Z"
          fill="#16281F" opacity=".5" />
        <path d="M0 76 L48 60 L112 74 L178 54 L244 76 L306 58 L358 76 L390 66 L390 108 L0 108 Z"
          fill="#112019" opacity=".6" />

        {/* 星与月 */}
        <circle cx="336" cy="26" r="24" fill="#FFF6DA" opacity=".13" />
        <circle cx="336" cy="26" r="9" fill="#FFF8E3" opacity=".8" />
        {[[52,20,1.1,.5],[104,34,.9,.35],[152,16,1.2,.45],[212,30,.9,.32],[264,20,1.1,.4],[28,42,.9,.3]]
          .map(([cx, cy, r, o], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="#FFF8E3" opacity={o}
              className="twinkle" style={{ animationDelay: `${(i % 4) * 0.6}s` }} />
          ))}

        {variant === 'players' && (
          <g>
            {/* 庭院石桌与四凳，呼应「牌友聚首」 */}
            <ellipse cx="195" cy="86" rx="40" ry="12" fill="#14241C" opacity=".55" />
            <ellipse cx="195" cy="80" rx="34" ry="10" fill="#3E5C4B" />
            <ellipse cx="195" cy="78" rx="34" ry="10" fill="#4E7660" />
            <rect x="190" y="84" width="10" height="14" fill="#2A4235" />
            {[[150,86],[240,86],[172,96],[218,96]].map(([cx, cy], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx="11" ry="4" fill="#33503F" />
            ))}
            {/* 桌上麻将牌 */}
            {[[182,74],[190,73],[198,73],[206,74]].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width="6" height="8" rx="1.5" fill="#F5EFDF" opacity=".9" />
            ))}
          </g>
        )}

        {variant === 'ai' && (
          <g>
            {/* 竹屋书案与灯 —— 呼应「问答」 */}
            <path d="M148 58 L195 42 L242 58 L236 61 L195 47 L154 61 Z" fill="#5E2B24" />
            <rect x="164" y="61" width="62" height="30" fill="#22332A" />
            <rect x="174" y="68" width="16" height="14" fill="#E8B44A" opacity=".5" />
            <rect x="200" y="68" width="16" height="14" fill="#E8B44A" opacity=".32" />
            <circle cx="195" cy="40" r="3" fill="#D4AC42" />
            {/* 悬浮问号灯 */}
            <g className="ai-orb">
              <circle cx="286" cy="62" r="13" fill="#4E8367" opacity=".28" />
              <circle cx="286" cy="62" r="8" fill="#E8B44A" opacity=".55" />
              <text x="286" y="66" textAnchor="middle" fontSize="10" fontWeight="700" fill="#2A1F08">?</text>
            </g>
            <g className="ai-orb ai-orb-b">
              <circle cx="104" cy="52" r="9" fill="#E8B44A" opacity=".3" />
            </g>
          </g>
        )}

        {variant === 'login' && (
          <g>
            {/* 门面页：楼阁 + 双灯笼 + 石桌，信息量高于其他二级页 */}
            <path d="M152 54 L195 36 L238 54 L231 57 L195 42 L159 57 Z" fill="#5E2B24" />
            <path d="M159 57 Q195 48 231 57 L231 61 Q195 52 159 61 Z" fill="#7A3B32" />
            <path d="M159 58 q-13 -2 -19 -10 q9 4 14 6 q-3 -5 -1 -9 q4 6 9 10 Z" fill="#7A3B32" />
            <path d="M231 58 q13 -2 19 -10 q-9 4 -14 6 q3 -5 1 -9 q-4 6 -9 10 Z" fill="#7A3B32" />
            <rect x="170" y="61" width="50" height="28" fill="#22332A" />
            <rect x="178" y="67" width="13" height="15" fill="#E8B44A" opacity=".5" />
            <rect x="199" y="67" width="13" height="15" fill="#E8B44A" opacity=".34" />
            <path d="M195 30 L198 40 L192 40 Z" fill="#B8901F" />
            <circle cx="195" cy="28" r="2.6" fill="#D4AC42" />
            <g className="lantern lantern-a">
              <line x1="132" y1="48" x2="132" y2="58" stroke="#3E1B17" strokeWidth="1.3" />
              <ellipse cx="132" cy="65" rx="7" ry="9" fill="#C4402F" />
              <rect x="129" y="56" width="6" height="2.5" fill="#B8901F" />
              <rect x="129" y="73" width="6" height="2.5" fill="#B8901F" />
            </g>
            <g className="lantern lantern-b">
              <line x1="258" y1="50" x2="258" y2="60" stroke="#3E1B17" strokeWidth="1.3" />
              <ellipse cx="258" cy="67" rx="6.5" ry="8.5" fill="#C4402F" />
              <rect x="255" y="58" width="6" height="2.5" fill="#B8901F" />
              <rect x="255" y="74" width="6" height="2.5" fill="#B8901F" />
            </g>
            {/* 前景石桌与四座，暗示「四方入局」 */}
            <ellipse cx="195" cy="97" rx="30" ry="9" fill="#14241C" opacity=".5" />
            <ellipse cx="195" cy="93" rx="25" ry="7.5" fill="#4E7660" />
            {[[160, 98], [230, 98], [178, 104], [212, 104]].map(([cx, cy], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx="8.5" ry="3.2" fill="#33503F" />
            ))}
            {[[185, 89], [192, 88], [199, 88]].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width="5" height="7" rx="1.2" fill="#F5EFDF" opacity=".85" />
            ))}
          </g>
        )}

        {variant === 'me' && (
          <g>
            {/* 孤亭远眺 */}
            <path d="M160 52 L195 38 L230 52 L224 55 L195 43 L166 55 Z" fill="#5E2B24" />
            <rect x="178" y="55" width="34" height="26" fill="#22332A" />
            <rect x="186" y="61" width="8" height="12" fill="#E8B44A" opacity=".45" />
            <path d="M195 34 L198 44 L192 44 Z" fill="#B8901F" />
            <path d="M120 92 q38 -10 76 0 q38 10 76 0" stroke="#16281F" strokeWidth="1.5" fill="none" opacity=".4" />
          </g>
        )}

        {/* 两侧竹 */}
        {[[16, 14], [34, 34], [356, 18], [374, 40]].map(([x, top], i) => (
          <g key={i} opacity={i % 2 ? '.55' : '.75'}>
            <path d={`M${x} 108 L${x} ${top}`} stroke="#112019" strokeWidth="3" fill="none" />
            <path d={`M${x} ${top + 26} q${i % 2 ? 13 : -13} -10 ${i % 2 ? 21 : -21} -5`}
              stroke="#112019" strokeWidth="1.8" fill="none" />
            <g stroke="#0B1610" strokeWidth="1.8" opacity=".55">
              <path d={`M${x - 3} ${top + 24} L${x + 3} ${top + 24}`} />
              <path d={`M${x - 3} ${top + 54} L${x + 3} ${top + 54}`} />
            </g>
          </g>
        ))}

        <rect y="72" width="390" height="36" fill={`url(#ms-fade-${variant})`} />
      </svg>
      <div className="scene-fade" />
    </div>
  );
}

/**
 * 朱红方印品牌符号。取「局」字，篆刻感。
 * 抽象字形而非具象牌面，延续 D-008「气质承载于配色而非图形」的边界。
 */
export function SealMark({ size = 68, animate = true }) {
  return (
    <div className={`seal ${animate ? 'seal-in' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="seal-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D24F3A" />
            <stop offset="52%" stopColor="#C4402F" />
            <stop offset="100%" stopColor="#A32E20" />
          </linearGradient>
          <filter id="seal-rough">
            <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
          </filter>
        </defs>
        <g filter="url(#seal-rough)">
          <rect x="6" y="6" width="88" height="88" rx="10" fill="url(#seal-face)" />
          <rect x="14" y="14" width="72" height="72" rx="5" fill="none" stroke="#FBEDE9" strokeWidth="2.6" opacity=".82" />
        </g>
        {/* 「局」字。用系统字形而非自绘笔画：自绘几何线条渲染出来是个「回」形方框，
            又会退回「符号意义不明」的老问题。字重与字距按印章观感调过。 */}
        <text
          x="50" y="46.2"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="52"
          fontWeight="600"
          fill="#FFF3EE"
          style={{
            fontFamily: '"Songti SC", "STSong", "SimSun", "Noto Serif SC", serif',
            letterSpacing: '0'
          }}
        >
          局
        </text>
      </svg>
    </div>
  );
}

/** 木质雕花边框容器 */
export function WoodFrame({ title, children, tone = 'default' }) {
  return (
    <section className={`wood-frame wood-${tone}`}>
      <div className="wood-top">
        <span className="wood-nail wood-nail-l" />
        {title && (
          <div className="wood-plaque">
            <span className="plaque-text">{title}</span>
          </div>
        )}
        <span className="wood-nail wood-nail-r" />
      </div>
      <div className="wood-body">
        <span className="wood-corner wc-tl" />
        <span className="wood-corner wc-tr" />
        <span className="wood-corner wc-bl" />
        <span className="wood-corner wc-br" />
        {children}
      </div>
      <div className="wood-bottom" />
    </section>
  );
}

/** 麻将牌造型的名次牌 */
export function MahjongTile({ rank, flipDelay = 0, children }) {
  const tone = ['gold', 'silver', 'bronze'][rank] || 'gold';
  return (
    <div className={`mj-tile mj-${tone}`} style={{ animationDelay: `${flipDelay}ms` }}>
      <span className="mj-glow" />
      <div className="mj-tile-face">
        <span className="mj-texture" />
        <span className="mj-carve" />
        <span className="mj-tile-dot mj-dot-tl" />
        <span className="mj-tile-dot mj-dot-br" />
        <span className="mj-shine" />
        <span className="mj-jade" />
        {children}
      </div>
      <span className="mj-tile-side" />
    </div>
  );
}

/** 熊猫吉祥物 */
export function Panda({ size = 96, mood = 'idle' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={`panda panda-${mood}`}>
      <ellipse cx="60" cy="108" rx="34" ry="6" fill="#1F1D1A" opacity=".12" />
      <circle cx="30" cy="30" r="15" fill="#1F1D1A" />
      <circle cx="90" cy="30" r="15" fill="#1F1D1A" />
      <circle cx="30" cy="30" r="7" fill="#3A3733" />
      <circle cx="90" cy="30" r="7" fill="#3A3733" />
      <ellipse cx="60" cy="62" rx="42" ry="38" fill="#FFFDF8" />
      <ellipse cx="60" cy="62" rx="42" ry="38" fill="none" stroke="#E0DBD0" strokeWidth="1.5" />
      <ellipse cx="42" cy="56" rx="13" ry="16" fill="#1F1D1A" transform="rotate(-12 42 56)" />
      <ellipse cx="78" cy="56" rx="13" ry="16" fill="#1F1D1A" transform="rotate(12 78 56)" />
      <circle cx="44" cy="58" r="5" fill="#FFFDF8" />
      <circle cx="76" cy="58" r="5" fill="#FFFDF8" />
      <circle cx="45" cy="59" r="2.6" fill="#1F1D1A" />
      <circle cx="77" cy="59" r="2.6" fill="#1F1D1A" />
      <circle cx="46.2" cy="57.6" r=".9" fill="#fff" />
      <circle cx="78.2" cy="57.6" r=".9" fill="#fff" />
      <ellipse cx="60" cy="76" rx="5" ry="3.6" fill="#1F1D1A" />
      <path d="M60 80 q-7 7 -13 2" stroke="#1F1D1A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M60 80 q7 7 13 2" stroke="#1F1D1A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="26" cy="72" rx="7" ry="4.5" fill="#C4553D" opacity=".22" />
      <ellipse cx="94" cy="72" rx="7" ry="4.5" fill="#C4553D" opacity=".22" />
      {mood === 'play' && (
        <g className="panda-tile">
          <rect x="80" y="84" width="24" height="31" rx="4" fill="#FFFDF6" stroke="#B8901F" strokeWidth="1.5" />
          <circle cx="92" cy="95" r="3.2" fill="#4A7C63" />
          <circle cx="92" cy="105" r="3.2" fill="#C4553D" />
        </g>
      )}
    </svg>
  );
}

/** 空状态：熊猫 + 文案 */
export function EmptyPanda({ text, hint, children }) {
  return (
    <div className="empty empty-rich">
      <Panda size={112} mood="play" />
      <div className="empty-text" style={{ marginTop: 'var(--s3)' }}>{text}</div>
      {hint && <div className="empty-hint">{hint}</div>}
      {children && <div style={{ marginTop: 'var(--s4)' }}>{children}</div>}
    </div>
  );
}

/** 金箔立体标题。size="sm" 为二级页紧凑版 */
export function GoldTitle({ children, sub, slogan, size = 'lg' }) {
  return (
    <div className={`gold-head gold-head-${size}`}>
      <div className="gold-ornament gold-orn-l" />
      <h1 className={`gold-title gold-title-${size}`}>
        <span className="gold-title-inner">{children}</span>
        <span className="gold-sweep" />
      </h1>
      <div className="gold-ornament gold-orn-r" />
      {slogan && <p className="gold-slogan">{slogan}</p>}
      {sub && <p className="gold-sub">{sub}</p>}
    </div>
  );
}
