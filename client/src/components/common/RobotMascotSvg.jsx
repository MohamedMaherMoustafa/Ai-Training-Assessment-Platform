import { useMemo } from "react";
import { CHATBOT_SKINS } from "../../features/store/storeData";

export default function RobotMascotSvg({
  skinId = "skin_classic_blue",
  hatId = "hat_none",
  glassesId = "glasses_none",
  shoesId = "shoes_none",
  width = 88,
  height = 94,
  className = "w-[78px] h-[84px] sm:w-[86px] sm:h-[92px] overflow-visible",
  showSign = true,
  signText = "HELP!",
  isWaving = false,
  isCoveringEyes = false,
  isPeeking = false,
  idPrefix = "bot",
}) {
  const skin = useMemo(() => {
    return (
      CHATBOT_SKINS.find((s) => s.id === skinId) ||
      CHATBOT_SKINS[0]
    );
  }, [skinId]);

  const colors = skin.colors;
  const bodyGradId = `${idPrefix}_bodyGrad_${skinId}`;
  const metalGradId = `${idPrefix}_metalGrad_${skinId}`;
  const signGradId = `${idPrefix}_signGrad_${skinId}`;
  const shadowFilterId = `${idPrefix}_signShadow`;

  const signContent = useMemo(() => {
    const raw = String(signText || "").trim();
    // Match trailing emoji if any
    const emojiRegex = /([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+)$/u;
    const match = raw.match(emojiRegex);
    if (match) {
      const emoji = match[1];
      const text = raw.replace(emojiRegex, "").trim();
      return { text, emoji };
    }
    return { text: raw, emoji: null };
  }, [signText]);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 104"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient
          id={bodyGradId}
          x1="18"
          y1="16"
          x2="62"
          y2="66"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={colors.bodyGradStart} />
          <stop offset="0.55" stopColor={colors.bodyGradMid} />
          <stop offset="1" stopColor={colors.bodyGradEnd} />
        </linearGradient>

        <linearGradient
          id={metalGradId}
          x1="20"
          y1="10"
          x2="60"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={colors.metalStart} />
          <stop offset="1" stopColor={colors.metalEnd} />
        </linearGradient>

        <linearGradient
          id={signGradId}
          x1="55"
          y1="2"
          x2="118"
          y2="25"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={colors.signGradStart} />
          <stop offset="1" stopColor={colors.signGradEnd} />
        </linearGradient>

        <filter id={shadowFilterId} x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor={colors.glowColor}
            floodOpacity="0.35"
          />
        </filter>
      </defs>

      {/* Antenna (Visible when hat allows or blends) */}
      {hatId !== "hat_wizard" && hatId !== "hat_top_hat" && (
        <g className="robot-antenna">
          <line
            x1="44"
            y1="17"
            x2="44"
            y2="8"
            stroke={colors.bodyGradStart}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="44" cy="7" r="4.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
          <circle
            cx="44"
            cy="7"
            r="7.5"
            stroke="#fbbf24"
            strokeWidth="1"
            strokeDasharray="2 2"
            className="opacity-80 animate-pulse"
          />
        </g>
      )}

      {/* Arms & Handheld Sign (Hidden while covering eyes) */}
      {!isCoveringEyes && (
        <>
          {/* Left Arm: Resting */}
          <g className="robot-arm-l">
            <rect
              x="16"
              y="45"
              width="8"
              height="19"
              rx="4"
              fill={`url(#${metalGradId})`}
              stroke={colors.glowColor}
              strokeWidth="1.5"
            />
            <circle cx="20" cy="64" r="3.5" fill={colors.bodyGradStart} />
          </g>

          {/* Right Arm & Sign Board */}
          {showSign ? (
            <g className={`robot-arm-sign ${isWaving ? "animate-bounce" : ""}`}>
              {/* Upper Arm */}
              <rect
                x="58"
                y="27"
                width="9"
                height="21"
                rx="4.5"
                fill={`url(#${metalGradId})`}
                stroke={colors.glowColor}
                strokeWidth="1.5"
                transform="rotate(-36 60 44)"
              />
              {/* Hand holding pole */}
              <circle
                cx="75"
                cy="27"
                r="5"
                fill={colors.bodyGradStart}
                stroke="#ffffff"
                strokeWidth="1.2"
              />
              <path
                d="M72 26 L69 22 M75 25 L75 20 M78 26 L81 23"
                stroke={colors.bodyGradStart}
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Sign Pole */}
              <line
                x1="75"
                y1="32"
                x2="82"
                y2="4"
                stroke={colors.glowColor}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="82" cy="4" r="2.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" />

              {/* Sign Board */}
              <g filter={`url(#${shadowFilterId})`}>
                <rect
                  x="55"
                  y="2"
                  width="63"
                  height="22.5"
                  rx="6.5"
                  fill={`url(#${signGradId})`}
                  stroke="#ffffff"
                  strokeWidth="1.6"
                />
                {/* LED Status Indicator - placed cleanly in top-left corner */}
                <circle cx="60.5" cy="6.5" r="1.3" fill={colors.ledColor} className="animate-pulse" opacity="0.9" />
                {/* Sign Text & Icon with comfortable spacing and no border clipping */}
                <text
                  x="87.5"
                  y="13.5"
                  fill="#ffffff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', system-ui, sans-serif"
                >
                  <tspan
                    fontSize={
                      signContent.text.length >= 8
                        ? "7"
                        : signContent.text.length >= 6
                        ? "7.6"
                        : "8.5"
                    }
                    fontWeight="900"
                    letterSpacing="0.3"
                  >
                    {signContent.text}
                  </tspan>
                  {signContent.emoji && (
                    <tspan dx="4" fontSize="9">
                      {signContent.emoji}
                    </tspan>
                  )}
                </text>
              </g>
            </g>
          ) : (
            /* Alternative Right Arm (Resting symmetrically) */
            <g className="robot-arm-r">
              <rect
                x="64"
                y="45"
                width="8"
                height="19"
                rx="4"
                fill={`url(#${metalGradId})`}
                stroke={colors.glowColor}
                strokeWidth="1.5"
              />
              <circle cx="68" cy="64" r="3.5" fill={colors.bodyGradStart} />
            </g>
          )}
        </>
      )}

      {/* Legs */}
      <g className="robot-legs">
        <rect x="30" y="67" width="9" height="15" rx="4" fill="#334155" className="robot-leg-l" />
        <rect x="47" y="67" width="9" height="15" rx="4" fill="#334155" className="robot-leg-r" />

        {/* Footwear / Shoes */}
        {shoesId === "shoes_cyber_sneakers" && (
          <g className="shoes-cyber-sneakers">
            {/* Left Sneaker */}
            <path
              d="M26 77 C26 75 39 75 41 77 L43 83 L25 83 Z"
              fill="#06b6d4"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
            <rect x="24" y="82" width="19" height="4" rx="2" fill="#22d3ee" className="animate-pulse" />
            <line x1="28" y1="78" x2="38" y2="78" stroke="#ffffff" strokeWidth="1" />
            {/* Right Sneaker */}
            <path
              d="M43 77 C43 75 56 75 58 77 L60 83 L42 83 Z"
              fill="#06b6d4"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
            <rect x="41" y="82" width="19" height="4" rx="2" fill="#22d3ee" className="animate-pulse" />
            <line x1="45" y1="78" x2="55" y2="78" stroke="#ffffff" strokeWidth="1" />
          </g>
        )}

        {shoesId === "shoes_rocket_boosters" && (
          <g className="shoes-rocket-boosters">
            {/* Left Thruster Pod */}
            <rect x="27" y="76" width="15" height="8" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
            <polygon points="30,84 34.5,95 39,84" fill="#f59e0b" className="animate-pulse" />
            <polygon points="32,84 34.5,91 37,84" fill="#ef4444" />
            {/* Right Thruster Pod */}
            <rect x="44" y="76" width="15" height="8" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
            <polygon points="47,84 51.5,95 56,84" fill="#f59e0b" className="animate-pulse" />
            <polygon points="49,84 51.5,91 54,84" fill="#ef4444" />
          </g>
        )}

        {shoesId === "shoes_winged_boots" && (
          <g className="shoes-winged-boots">
            {/* Left Gold Boot */}
            <rect x="27" y="77" width="14" height="7" rx="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            {/* Left Wing */}
            <path
              d="M26 78 C20 75 19 69 24 67 C25 72 26 75 26 78 Z"
              fill="#ffffff"
              stroke="#fbbf24"
              strokeWidth="0.8"
            />
            {/* Right Gold Boot */}
            <rect x="45" y="77" width="14" height="7" rx="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            {/* Right Wing */}
            <path
              d="M59 78 C65 75 66 69 61 67 C60 72 59 75 59 78 Z"
              fill="#ffffff"
              stroke="#fbbf24"
              strokeWidth="0.8"
            />
          </g>
        )}

        {shoesId === "shoes_roller_skates" && (
          <g className="shoes-roller-skates">
            {/* Left Boot & Wheels */}
            <rect x="28" y="76" width="13" height="6" rx="2" fill="#ec4899" />
            <circle cx="30" cy="85" r="2.5" fill="#a855f7" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="39" cy="85" r="2.5" fill="#a855f7" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="30" y1="83" x2="39" y2="83" stroke="#e2e8f0" strokeWidth="1.2" />
            {/* Right Boot & Wheels */}
            <rect x="45" y="76" width="13" height="6" rx="2" fill="#ec4899" />
            <circle cx="47" cy="85" r="2.5" fill="#a855f7" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="56" cy="85" r="2.5" fill="#a855f7" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="47" y1="83" x2="56" y2="83" stroke="#e2e8f0" strokeWidth="1.2" />
          </g>
        )}

        {(!shoesId || shoesId === "shoes_none") && (
          /* Default Magnetic Pads */
          <>
            <rect x="28" y="78" width="13" height="6" rx="3" fill={colors.glowColor} className="robot-leg-l" />
            <rect x="45" y="78" width="13" height="6" rx="3" fill={colors.glowColor} className="robot-leg-r" />
          </>
        )}
      </g>

      {/* Robot Torso */}
      <rect
        x="25"
        y="43"
        width="36"
        height="27"
        rx="10"
        fill={`url(#${bodyGradId})`}
        stroke={colors.borderColor}
        strokeWidth="2"
      />
      {/* Torso Screen / Gauges */}
      <rect x="33" y="50" width="20" height="12" rx="4" fill="#0f172a" fillOpacity="0.75" />
      <circle cx="38" cy="56" r="2.2" fill={colors.ledColor} className="animate-pulse" />
      <circle cx="43" cy="56" r="2.2" fill={colors.bodyGradStart} />
      <circle cx="48" cy="56" r="2.2" fill="#fbbf24" />

      {/* Robot Head */}
      <rect
        x="22"
        y="16"
        width="42"
        height="28"
        rx="11"
        fill={`url(#${metalGradId})`}
        stroke={colors.bodyGradStart}
        strokeWidth="2.2"
      />
      {/* Visor Area */}
      <rect x="27" y="21" width="32" height="17" rx="6" fill="#0f172a" />

      {/* Eyes & Mouth (Base Eyes) */}
      <circle cx="36" cy="28" r="3.2" fill={colors.bodyGradStart} />
      <circle cx="50" cy="28" r="3.2" fill={colors.bodyGradStart} />
      <path
        d="M38 33.5C40 35.5 46 35.5 48 33.5"
        stroke={colors.ledColor}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Eyewear / Glasses Layer */}
      {glassesId === "glasses_cool_shades" && (
        <g className="glasses-cool-shades">
          {/* Black Frames with Gradient Reflection */}
          <path
            d="M27 24 C31 24 39 25 41 27 C43 25 51 24 55 24 L56 31 C52 33 44 33 42 29 C40 33 32 33 28 31 Z"
            fill="#090d16"
            stroke="#38bdf8"
            strokeWidth="0.8"
          />
          {/* Lens gloss bars */}
          <line x1="30" y1="26" x2="37" y2="29" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
          <line x1="45" y1="26" x2="52" y2="29" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        </g>
      )}

      {glassesId === "glasses_vr_visor" && (
        <g className="glasses-vr-visor">
          <rect
            x="25"
            y="21"
            width="36"
            height="14"
            rx="4"
            fill="#0284c7"
            stroke="#38bdf8"
            strokeWidth="1.2"
          />
          <line
            x1="27"
            y1="28"
            x2="59"
            y2="28"
            stroke="#a5f3fc"
            strokeWidth="1.8"
            className="animate-pulse"
          />
          <circle cx="43" cy="28" r="2" fill="#ffffff" />
        </g>
      )}

      {glassesId === "glasses_geek_round" && (
        <g className="glasses-geek-round">
          {/* Left Lens */}
          <circle cx="36" cy="28" r="6.2" fill="none" stroke="#fbbf24" strokeWidth="1.4" />
          {/* Right Lens */}
          <circle cx="50" cy="28" r="6.2" fill="none" stroke="#fbbf24" strokeWidth="1.4" />
          {/* Bridge */}
          <path d="M42.2 28 C43.5 26.5 44.5 26.5 45.8 28" stroke="#fbbf24" strokeWidth="1.4" fill="none" />
        </g>
      )}

      {glassesId === "glasses_thug_pixel" && (
        <g className="glasses-thug-pixel">
          <rect x="29" y="25" width="13" height="6" fill="#000000" />
          <rect x="44" y="25" width="13" height="6" fill="#000000" />
          <rect x="41" y="26" width="4" height="2" fill="#000000" />
          {/* Pixel whites */}
          <rect x="30" y="26" width="2" height="2" fill="#ffffff" />
          <rect x="45" y="26" width="2" height="2" fill="#ffffff" />
        </g>
      )}

      {glassesId === "glasses_steampunk" && (
        <g className="glasses-steampunk">
          <circle cx="50" cy="28" r="6.5" fill="none" stroke="#d97706" strokeWidth="1.6" />
          <circle cx="50" cy="28" r="7.5" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          {/* Chain dangling */}
          <path d="M56 31 Q60 38 62 48" stroke="#d97706" strokeWidth="1" fill="none" strokeDasharray="1 1" />
        </g>
      )}

      {/* Arms & Hands Covering Eyes with Fingers */}
      {isCoveringEyes && (
        <g className="robot-covering-eyes animate-fadeIn">
          {/* Cute Shy Blush Marks on Cheeks */}
          <ellipse cx="26" cy="35" rx="3.5" ry="2" fill="#fb7185" opacity="0.8" />
          <ellipse cx="60" cy="35" rx="3.5" ry="2" fill="#fb7185" opacity="0.8" />

          {/* Left Raised Arm link from shoulder */}
          <path
            d="M 19 54 Q 13 36 28 28"
            stroke={colors.glowColor}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 19 54 Q 13 36 28 28"
            stroke={`url(#${metalGradId})`}
            strokeWidth="3.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Right Raised Arm link from shoulder */}
          <path
            d="M 67 54 Q 73 36 58 28"
            stroke={colors.glowColor}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 67 54 Q 73 36 58 28"
            stroke={`url(#${metalGradId})`}
            strokeWidth="3.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Left Hand & Fingers covering Left Eye (cx=36, cy=28) */}
          <g className="left-hand-cover" transform="rotate(-6 35 28)">
            {/* Palm Base */}
            <rect
              x="28"
              y="22"
              width="14"
              height="11"
              rx="4"
              fill={`url(#${metalGradId})`}
              stroke={colors.glowColor}
              strokeWidth="1.2"
            />
            {/* Robotic Fingers hiding eye */}
            <rect x="29" y="19" width="2.8" height="7" rx="1.4" fill={colors.bodyGradStart} stroke="#ffffff" strokeWidth="0.8" />
            <rect x="32.5" y="18" width="2.8" height="8" rx="1.4" fill={colors.bodyGradStart} stroke="#ffffff" strokeWidth="0.8" />
            <rect x="36" y="18.5" width="2.8" height="7.5" rx="1.4" fill={colors.bodyGradStart} stroke="#ffffff" strokeWidth="0.8" />
            <rect x="39.5" y="20" width="2.6" height="6" rx="1.3" fill={colors.bodyGradStart} stroke="#ffffff" strokeWidth="0.8" />
          </g>

          {/* Right Hand & Fingers covering Right Eye (cx=50, cy=28) */}
          <g
            className="right-hand-cover"
            transform={isPeeking ? "rotate(14 53 28) translate(3, 0)" : "rotate(6 51 28)"}
          >
            {/* Palm Base */}
            <rect
              x="44"
              y="22"
              width="14"
              height="11"
              rx="4"
              fill={`url(#${metalGradId})`}
              stroke={colors.glowColor}
              strokeWidth="1.2"
            />
            {/* Robotic Fingers hiding eye */}
            <rect x="44" y="20" width="2.6" height="6" rx="1.3" fill={colors.bodyGradStart} stroke="#ffffff" strokeWidth="0.8" />
            <rect x="47.5" y="18.5" width="2.8" height="7.5" rx="1.4" fill={colors.bodyGradStart} stroke="#ffffff" strokeWidth="0.8" />
            <rect x="51" y="18" width="2.8" height="8" rx="1.4" fill={colors.bodyGradStart} stroke="#ffffff" strokeWidth="0.8" />
            <rect x="54.5" y="19" width="2.8" height="7" rx="1.4" fill={colors.bodyGradStart} stroke="#ffffff" strokeWidth="0.8" />
          </g>

          {/* If peeking, right eye glows through the finger gap */}
          {isPeeking && (
            <circle cx="50" cy="28" r="2.8" fill={colors.bodyGradStart} className="animate-pulse" />
          )}
        </g>
      )}

      {/* Headwear / Hats Layer */}
      {hatId === "hat_grad_cap" && (
        <g className="hat-grad-cap">
          {/* Mortarboard Diamond */}
          <polygon
            points="43,3 66,10 43,17 20,10"
            fill="#0f172a"
            stroke="#fbbf24"
            strokeWidth="0.8"
          />
          {/* Cap Base */}
          <path d="M31 13 L31 18 C31 20 55 20 55 18 L55 13 Z" fill="#1e293b" />
          {/* Gold Button & Tassel */}
          <circle cx="43" cy="10" r="1.8" fill="#fbbf24" />
          <path
            d="M43 10 C34 11 25 12 24 18"
            stroke="#fbbf24"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
          <polygon points="22,18 26,18 24,24" fill="#fbbf24" />
        </g>
      )}

      {hatId === "hat_wizard" && (
        <g className="hat-wizard">
          {/* Pointy Cone */}
          <polygon
            points="44,-4 58,15 28,15"
            fill="#7e22ce"
            stroke="#a855f7"
            strokeWidth="1"
          />
          {/* Wide Brim */}
          <ellipse cx="43" cy="15" rx="19" ry="3.5" fill="#6b21a8" stroke="#a855f7" strokeWidth="0.8" />
          {/* Star Accent */}
          <polygon points="43,4 44.5,7.5 48,8 45.5,10.5 46,14 43,12 40,14 40.5,10.5 38,8 41.5,7.5" fill="#fbbf24" />
        </g>
      )}

      {hatId === "hat_top_hat" && (
        <g className="hat-top-hat">
          {/* Crown Cylinder */}
          <rect x="33" y="1" width="20" height="15" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          {/* Red Ribbon */}
          <rect x="33" y="12" width="20" height="4" fill="#e11d48" />
          {/* Brim */}
          <ellipse cx="43" cy="16" rx="18" ry="3.5" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
        </g>
      )}

      {hatId === "hat_headphones" && (
        <g className="hat-headphones">
          {/* Arc Band */}
          <path
            d="M20 26 C20 8 66 8 66 26"
            fill="none"
            stroke="#0284c7"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Left Earcup */}
          <rect x="18" y="21" width="6" height="13" rx="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
          {/* Right Earcup */}
          <rect x="62" y="21" width="6" height="13" rx="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
        </g>
      )}

      {hatId === "hat_royal_crown" && (
        <g className="hat-royal-crown">
          {/* Golden Crown */}
          <polygon
            points="26,16 28,5 34,11 43,2 52,11 58,5 60,16"
            fill="#fbbf24"
            stroke="#d97706"
            strokeWidth="1.2"
          />
          {/* Jewels */}
          <circle cx="28" cy="6" r="1.5" fill="#ef4444" />
          <circle cx="43" cy="3" r="1.8" fill="#3b82f6" />
          <circle cx="58" cy="6" r="1.5" fill="#10b981" />
          <line x1="26" y1="14" x2="60" y2="14" stroke="#d97706" strokeWidth="1.2" />
        </g>
      )}

      {hatId === "hat_detective" && (
        <g className="hat-detective">
          {/* Crown */}
          <path
            d="M32 15 C33 9 39 8 43 9 C47 8 53 9 54 15 Z"
            fill="#78350f"
            stroke="#451a03"
            strokeWidth="0.8"
          />
          {/* Dark Ribbon */}
          <rect x="32" y="13" width="22" height="2.5" fill="#451a03" />
          {/* Brim */}
          <ellipse cx="43" cy="15.5" rx="18" ry="3.5" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
        </g>
      )}
    </svg>
  );
}
