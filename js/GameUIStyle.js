// GameUIStyle.js — стили интерфейса игры (DOM поверх канваса). Тема «яркий весёлый салон»:
// кремовые талоны с барбер-каймой, круглые зеркала с лампочками, пилюли с объёмной тенью.
// Размеры пишутся как «2.5u»: u — единица интерфейса в px (переменная --u, её ставит GameUI по размеру окна;
// минимум 14.7 px, так что кнопка 3u — не меньше 44 px под палец). Модуль даёт строку GAME_UI_STYLE.

const GAME_UI_STYLE = (() => {
    const raw = `
@font-face{font-family:'Nunito';src:url('assets/fonts/nunito.ttf') format('truetype');font-weight:200 1000;font-style:normal;font-display:swap}

#gu{position:fixed;inset:0;z-index:20;pointer-events:none;overflow:hidden;
  --teal:#23c4c9;--coral:#ff6b6b;--yellow:#ffd23f;--cream:#fff4e0;--cream2:#ffe3b8;--navy:#27314f;--navy2:#4a5680;--green:#3ecf6a;--green2:#25a04c;
  font-family:'Nunito','Arial Rounded MT Bold','Trebuchet MS',system-ui,sans-serif;font-weight:900;color:var(--navy);
  font-size:var(--u);line-height:1.1;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}
#gu *{box-sizing:border-box;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
#gu img,#gu canvas{display:block;-webkit-user-drag:none;pointer-events:none}
:where(#gu button){font-family:inherit;font-weight:inherit;color:var(--navy);margin:0;padding:0;touch-action:manipulation;outline:none}
#gu [hidden]{display:none!important}

/* общий жирный текст с тёмной обводкой */
.gu-out{color:#fff;text-shadow:-.1u -.1u 0 var(--navy),.1u -.1u 0 var(--navy),-.1u .1u 0 var(--navy),.1u .1u 0 var(--navy),0 .1u 0 var(--navy),0 -.1u 0 var(--navy),.1u 0 0 var(--navy),-.1u 0 0 var(--navy),0 .22u 0 var(--navy)}

/* ---------- кнопки-пилюли ---------- */
.gu-btn{position:relative;pointer-events:auto;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.5u;
  min-height:3u;min-width:3u;padding:.4u 1.4u;border:.2u solid var(--navy);border-radius:99u;background:var(--green);color:#fff;
  font-size:1.15u;font-weight:1000;letter-spacing:.02em;white-space:nowrap;
  box-shadow:inset 0 .22u 0 rgba(255,255,255,.4),inset 0 -.28u 0 rgba(0,0,0,.2),0 .32u 0 var(--navy);
  transition:transform .08s,box-shadow .08s,filter .15s}
.gu-btn span{text-shadow:-.08u -.08u 0 var(--navy),.08u -.08u 0 var(--navy),-.08u .08u 0 var(--navy),.08u .08u 0 var(--navy),0 .18u 0 var(--navy)}
.gu-btn:active,.gu-btn.on-press{transform:translateY(.24u);box-shadow:inset 0 .22u 0 rgba(255,255,255,.4),inset 0 -.28u 0 rgba(0,0,0,.2),0 .08u 0 var(--navy)}
.gu-btn.coral{background:var(--coral)}.gu-btn.teal{background:var(--teal)}.gu-btn.yellow{background:var(--yellow);color:var(--navy)}.gu-btn.cream{background:var(--cream);color:var(--navy)}
.gu-btn.yellow span,.gu-btn.cream span{text-shadow:none}
.gu-btn.off{filter:grayscale(.85) brightness(.95);opacity:.75;cursor:default}
.gu-btn img{width:1.9u;height:1.9u;flex:none}
.gu-btn.big{min-height:3.4u;font-size:1.4u;padding:.5u 2.2u}
.gu-btn.round{padding:0;width:3.2u;height:3.2u;border-radius:50%}
.gu-btn.round img{width:2.2u;height:2.2u}

/* ---------- блоки HUD (позиции даёт HudLayout) ---------- */
.gu-blk{pointer-events:none}
.gu-hud{position:absolute;inset:0;pointer-events:none}
#gu:not(.gu-salon) .gu-salon-only,#gu:not(.gu-cut) .gu-cut-only{display:none!important}
#gu.gu-modal .gu-hud{visibility:hidden}

.gu-cash{display:flex;align-items:center;padding-left:2.4u;position:fixed}
.gu-cash-in{position:relative;display:flex;align-items:center;justify-content:flex-end;width:100%;height:2.4u;margin:0;padding:0 1.1u 0 2.2u;
  background:var(--navy);border:.18u solid var(--cream);border-radius:99u;box-shadow:0 .28u 0 rgba(0,0,0,.28),0 0 0 .12u var(--navy)}
.gu-cash img{position:absolute;left:-1.6u;top:50%;margin-top:-1.55u;width:3.1u;height:3.1u;filter:drop-shadow(0 .15u 0 rgba(0,0,0,.35))}
.gu-cash-v{font-size:1.45u;font-weight:1000;color:var(--yellow);font-variant-numeric:tabular-nums;white-space:nowrap}
.gu-cash.jump .gu-cash-in{animation:guJump .45s cubic-bezier(.2,1.8,.4,1)}

.gu-level{display:flex;align-items:center;padding-left:1.8u}
.gu-lvl-in{position:relative;width:100%;height:2.3u;display:flex;align-items:center;padding:0 .5u 0 1.9u;background:var(--cream);border:.18u solid var(--navy);border-radius:99u;box-shadow:0 .28u 0 rgba(0,0,0,.28)}
.gu-lvl-badge{position:absolute;left:-1.8u;top:50%;margin-top:-1.8u;width:3.6u;height:3.6u;display:flex;align-items:center;justify-content:center}
.gu-lvl-badge img{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 .15u 0 rgba(0,0,0,.3))}
.gu-lvl-badge b{position:relative;font-size:1.35u;margin-top:.25u}
.gu-bar{position:relative;flex:1;height:1.35u;background:#e8d5b0;border:.14u solid var(--navy);border-radius:99u;overflow:hidden}
.gu-bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:99u;transition:width .45s cubic-bezier(.3,1.3,.5,1);
  background:repeating-linear-gradient(-45deg,var(--coral) 0 .5u,#ff9a9a .5u 1u)}
.gu-bar em{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:.85u;color:#fff;
  text-shadow:-.07u -.07u 0 var(--navy),.07u -.07u 0 var(--navy),-.07u .07u 0 var(--navy),.07u .07u 0 var(--navy)}

.gu-side{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.1u;width:100%;height:100%;padding:.3u .2u;
  background:var(--yellow);border:.2u solid var(--navy);border-radius:1.2u;color:var(--navy);font-size:.8u;
  box-shadow:inset 0 .22u 0 rgba(255,255,255,.45),inset 0 -.28u 0 rgba(0,0,0,.14),0 .32u 0 var(--navy);pointer-events:auto;cursor:pointer;transition:transform .08s,box-shadow .08s}
.gu-side:active{transform:translateY(.24u);box-shadow:inset 0 .22u 0 rgba(255,255,255,.45),0 .08u 0 var(--navy)}
.gu-side img{width:2.3u;height:2.3u;flex:none}
.gu-side.teal{background:var(--teal)}
.gu-side.gift{background:var(--coral)}
.gu-side span{line-height:1;color:var(--navy)}
.gu-side.gift span,.gu-side.teal span{color:#fff;text-shadow:-.07u -.07u 0 var(--navy),.07u -.07u 0 var(--navy),-.07u .07u 0 var(--navy),.07u .07u 0 var(--navy)}
.gu-low .gu-side span{display:none}
.gu-low .gu-side img{width:2.2u;height:2.2u}
.gu-dot{position:absolute;right:-.5u;top:-.5u;width:1.5u;height:1.5u;border-radius:50%;background:#ff2d3d;border:.2u solid #fff;box-shadow:0 0 0 .14u var(--navy);animation:guPulse 1s ease-in-out infinite}
.gu-set{width:100%;height:100%;border-radius:50%;padding:0;background:var(--teal);border:.2u solid var(--navy);box-shadow:inset 0 .22u 0 rgba(255,255,255,.4),inset 0 -.28u 0 rgba(0,0,0,.2),0 .32u 0 var(--navy);pointer-events:auto;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .08s,box-shadow .08s}
.gu-set:active{transform:translateY(.24u);box-shadow:0 .08u 0 var(--navy)}
.gu-set img{width:2.1u;height:2.1u}

.gu-hint{display:flex;align-items:center;justify-content:center;gap:.7u}
.gu-hint-in{display:inline-flex;align-items:center;gap:.7u;padding:.5u 1.4u .5u .7u;background:var(--cream);border:.18u solid var(--navy);border-radius:99u;box-shadow:0 .28u 0 rgba(0,0,0,.28);font-size:1.15u;animation:guBob 1.4s ease-in-out infinite}
.gu-hint kbd{display:inline-flex;align-items:center;justify-content:center;min-width:2u;height:2u;padding:0 .5u;border-radius:.5u;background:var(--yellow);border:.16u solid var(--navy);box-shadow:0 .16u 0 var(--navy);font:inherit;font-size:1.1u}

.gu-sweep{display:flex;align-items:center;justify-content:center}
.gu-sweep-in{position:relative;display:flex;align-items:center;width:100%;height:100%}
.gu-sweep-in img{position:relative;z-index:2;width:2.6u;height:2.6u;margin-right:-.6u;flex:none}
.gu-sweep .gu-bar{height:1.2u;flex:1;background:var(--cream);border-width:.16u}
.gu-sweep .gu-bar i{background:repeating-linear-gradient(-45deg,var(--teal) 0 .5u,#7fe3e6 .5u 1u);transition:width .15s linear}

/* ---------- облачка реплик ---------- */
.gu-say{pointer-events:none}
.gu-bubble{position:relative;display:flex;align-items:center;gap:.9u;padding:.8u 1.2u .8u .8u;background:var(--cream);border:.22u solid var(--navy);border-radius:2u;box-shadow:0 .4u 0 rgba(0,0,0,.28);animation:guPop .4s cubic-bezier(.2,1.6,.4,1)}
.gu-bubble::after{content:'';position:absolute;left:50%;bottom:-.9u;width:1.3u;height:1.3u;background:var(--cream);border-right:.22u solid var(--navy);border-bottom:.22u solid var(--navy);transform:translateX(-50%) rotate(45deg)}
.gu-cut-bubble .gu-bubble::after{bottom:auto;top:-.9u;border:0;border-left:.22u solid var(--navy);border-top:.22u solid var(--navy)}
.gu-bubble.hide{animation:guOut .25s ease-in forwards}
.gu-who{display:flex;flex-direction:column;align-items:center;gap:.25u;flex:none}
.gu-mirror{position:relative;width:5.2u;height:5.2u;border-radius:50%;background:#bfe9ec;border:.3u solid var(--navy);box-shadow:0 0 0 .3u var(--yellow),0 0 0 .5u var(--navy);overflow:hidden;flex:none;transition:background .2s,box-shadow .2s}
.gu-mirror canvas{position:absolute;left:0;top:0;width:100%;height:100%}
.gu-bubble[data-mood=angry] .gu-mirror{background:#ffb3a8;box-shadow:0 0 0 .3u var(--coral),0 0 0 .5u var(--navy)}
.gu-bubble[data-mood=worry] .gu-mirror{background:#d9d4f5;box-shadow:0 0 0 .3u #9a8cf0,0 0 0 .5u var(--navy)}
.gu-bubble[data-mood=happy] .gu-mirror,.gu-bubble[data-mood=wow] .gu-mirror{box-shadow:0 0 0 .3u var(--green),0 0 0 .5u var(--navy)}
.gu-name{max-width:6u;padding:.2u .7u;background:var(--yellow);border:.14u solid var(--navy);border-radius:99u;font-size:.8u;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:7.5u}
.gu-txt{flex:1;min-width:0;font-size:1.15u;font-weight:900;line-height:1.2;color:var(--navy);word-break:break-word}
.gu-low .gu-mirror{width:4.2u;height:4.2u}
.gu-low .gu-txt{font-size:1.05u}

/* ---------- плашка-тост ---------- */
.gu-toast{position:fixed;left:50%;top:6.6u;transform:translateX(-50%);max-width:90%;padding:.7u 1.6u;background:var(--navy);color:#fff;border:.18u solid var(--cream);border-radius:99u;font-size:1.15u;text-align:center;box-shadow:0 .3u 0 rgba(0,0,0,.3);animation:guDrop .35s cubic-bezier(.2,1.6,.4,1);pointer-events:none;z-index:40}
.gu-toast.out{animation:guOut .25s ease-in forwards}
.gu-fly{position:fixed;left:0;top:0;z-index:41;font-size:1.7u;font-weight:1000;color:var(--yellow);white-space:nowrap;pointer-events:none;
  text-shadow:-.1u -.1u 0 var(--navy),.1u -.1u 0 var(--navy),-.1u .1u 0 var(--navy),.1u .1u 0 var(--navy),0 .25u 0 var(--navy)}

/* ---------- HUD стрижки ---------- */
.gu-cutl{display:flex;align-items:stretch;gap:.7u}
.gu-polaroid{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:.3u;padding:.6u .6u .5u;background:var(--cream);border:.2u solid var(--navy);border-radius:.8u;box-shadow:0 .35u 0 rgba(0,0,0,.28);transform:rotate(-1.5deg);transform-origin:20% 0;animation:guDrop .5s cubic-bezier(.2,1.6,.4,1)}
.gu-polaroid::before{content:'';position:absolute;left:50%;top:-.7u;width:3u;height:1.1u;margin-left:-1.5u;background:var(--coral);border:.14u solid var(--navy);border-radius:.3u;transform:rotate(3deg)}
.gu-photo{position:relative;width:100%;aspect-ratio:1/1;max-height:6.6u;background:#bfe9ec;border:.16u solid var(--navy);border-radius:.5u;overflow:hidden;display:flex;justify-content:center}
.gu-photo canvas{height:100%;width:auto;aspect-ratio:1/1}
.gu-pname{font-size:.95u;line-height:1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gu-preq{font-size:.72u;line-height:1.1;font-weight:800;color:var(--navy2);text-align:center;width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.gu-preq b{display:block;color:var(--coral);font-weight:1000}
.gu-low .gu-preq{display:none}
.gu-meter{position:relative;flex:none;width:2.8u;display:flex;justify-content:center;padding:.3u 0}
.gu-mbox{position:relative;width:1.5u;height:100%}
.gu-meter-bar{position:absolute;inset:0;background:var(--cream);border:.18u solid var(--navy);border-radius:99u;overflow:hidden;box-shadow:0 .28u 0 rgba(0,0,0,.28)}
.gu-meter-bar i{position:absolute;left:0;right:0;bottom:0;height:0;background:repeating-linear-gradient(-45deg,var(--teal) 0 .6u,#7fe3e6 .6u 1.2u);transition:height .25s ease-out}
.gu-meter.g1 .gu-meter-bar i{background:repeating-linear-gradient(-45deg,var(--yellow) 0 .6u,#ffe98f .6u 1.2u)}
.gu-meter.g3 .gu-meter-bar i{background:repeating-linear-gradient(-45deg,var(--green) 0 .6u,#8be8a8 .6u 1.2u)}
.gu-mark{position:absolute;left:50%;width:2.2u;height:2.2u;margin:0 0 -1.1u -1.1u;transition:transform .3s cubic-bezier(.2,2,.4,1),filter .2s}
.gu-mark img{width:100%;height:100%}
.gu-low .gu-mark{width:1.8u;height:1.8u;margin:0 0 -.9u -.9u}
.gu-mark.dim{filter:grayscale(1) brightness(.75);opacity:.9}
.gu-mark.lit{transform:scale(1.2)}
.gu-clumps{display:none;flex:none;flex-direction:column;align-items:center;justify-content:center;gap:.2u;width:3.4u;height:100%;padding:.4u;background:var(--teal);border:.2u solid var(--navy);border-radius:1.2u;box-shadow:0 .32u 0 rgba(0,0,0,.28);color:#fff}
.gu-clumps img{width:2.2u;height:2.2u}
.gu-clumps b{font-size:1.7u;line-height:1}
.gu-cutl.brush .gu-meter{display:none}
.gu-cutl.brush .gu-clumps{display:flex}
.gu-banner{display:flex;align-items:center;justify-content:center;gap:.8u;padding:.6u 1.4u;background:var(--teal);border:.2u solid var(--navy);border-radius:99u;box-shadow:0 .32u 0 rgba(0,0,0,.28);font-size:1.35u;animation:guPulse 1.2s ease-in-out infinite;text-align:center;line-height:1.05}
.gu-banner img{width:2.4u;height:2.4u;flex:none}

.gu-lens{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:.3u}
.gu-tall .gu-lens{flex-direction:row;justify-content:center}
.gu-len{position:relative;pointer-events:auto;cursor:pointer;flex:1;min-height:3u;min-width:3.6u;display:flex;align-items:center;justify-content:center;gap:.2u;padding:0 .3u;background:var(--cream);border:.18u solid var(--navy);border-radius:99u;font-size:1.05u;
  box-shadow:inset 0 .2u 0 rgba(255,255,255,.6),inset 0 -.25u 0 rgba(0,0,0,.1),0 .28u 0 var(--navy);transition:transform .08s,box-shadow .08s}
.gu-len:active{transform:translateY(.2u);box-shadow:0 .08u 0 var(--navy)}
.gu-len.sel{background:var(--yellow);outline:.2u solid #fff}
.gu-len.lock{background:#d8cfc0;color:var(--navy2)}
.gu-len img{width:1.3u;height:1.3u;flex:none}
.gu-len span{white-space:nowrap}
.gu-lens.none{display:none}

.gu-tools{display:flex;align-items:flex-end;justify-content:center;gap:.5u}
.gu-tool{position:relative;pointer-events:auto;cursor:pointer;flex:none;width:var(--tw,4u);height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.1u;padding:.2u;background:var(--cream);border:.2u solid var(--navy);border-radius:1.1u;
  box-shadow:inset 0 .22u 0 rgba(255,255,255,.6),inset 0 -.28u 0 rgba(0,0,0,.1),0 .32u 0 var(--navy);transition:transform .08s,background .15s}
.gu-tool:active{transform:translateY(.22u)}
.gu-tool img{width:2.5u;height:2.5u;flex:none}
.gu-tool span{font-size:.68u;line-height:1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gu-tool.sel{background:var(--yellow);transform:translateY(-.4u);outline:.2u solid #fff}
.gu-tool.lock img.t{filter:grayscale(1) brightness(.8);opacity:.55}
.gu-tool.lock{background:#d8cfc0}
.gu-tool .lk{position:absolute;left:50%;top:50%;width:1.7u;height:1.7u;margin:-1.2u 0 0 -.85u}
.gu-tool .lt{position:absolute;left:0;right:0;bottom:.3u;font-size:.7u;color:var(--coral)}
.gu-low .gu-tool span{display:none}
.gu-low .gu-tool .lt{display:block;bottom:.2u}

.gu-done{display:flex;align-items:center;justify-content:center}
.gu-done .gu-btn{width:100%;height:100%;font-size:1.4u}
.gu-done .gu-btn.pulse{animation:guPulse .8s ease-in-out infinite}
.gu-done .gu-btn.hide{display:none}
.gu-rot{display:flex;align-items:center;justify-content:center}
.gu-rot .gu-btn{width:100%;height:100%;touch-action:none}

/* ---------- окна ---------- */
.gu-ov{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:.8u;background:rgba(39,49,79,.8);pointer-events:auto;touch-action:none;animation:guFade .2s ease-out}
.gu-win{position:relative;display:flex;flex-direction:column;width:min(var(--w,34u),100%);max-height:100%;padding:.75u;border:.26u solid var(--navy);border-radius:2.1u;
  background:repeating-linear-gradient(-45deg,var(--coral) 0 .9u,var(--cream) .9u 1.8u,var(--teal) 1.8u 2.7u,var(--cream) 2.7u 3.6u);
  box-shadow:0 .6u 0 rgba(0,0,0,.3);animation:guPop .5s cubic-bezier(.2,1.6,.4,1);transform-origin:50% 60%}
.gu-win.closing{animation:guOut .18s ease-in forwards}
.gu-in{position:relative;display:flex;flex-direction:column;min-height:0;flex:1;background:var(--cream);border:.2u solid var(--navy);border-radius:1.6u;overflow:hidden}
.gu-head{display:flex;align-items:center;justify-content:space-between;gap:.8u;padding:.7u .8u .6u 1.4u;border-bottom:.16u dashed var(--navy2);flex:none;background:var(--cream2)}
.gu-head h2{margin:0;font-size:1.7u;font-weight:1000;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gu-head .gu-coins{display:inline-flex;align-items:center;gap:.4u;padding:.2u .9u .2u .3u;background:var(--navy);border-radius:99u;color:var(--yellow);font-size:1.2u;flex:none}
.gu-head .gu-coins img{width:1.9u;height:1.9u}
.gu-x{pointer-events:auto;cursor:pointer;flex:none;width:3u;height:3u;border-radius:50%;background:var(--coral);border:.2u solid var(--navy);display:flex;align-items:center;justify-content:center;
  box-shadow:inset 0 .2u 0 rgba(255,255,255,.4),0 .28u 0 var(--navy);transition:transform .08s,box-shadow .08s}
.gu-x:active{transform:translateY(.2u);box-shadow:0 .08u 0 var(--navy)}
.gu-x img{width:1.7u;height:1.7u}
.gu-body{flex:1;min-height:0;overflow:auto;padding:1u;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:var(--navy2) transparent}
.gu-foot{flex:none;display:flex;flex-direction:column;align-items:center;gap:.5u;padding:.6u 1u 1u;border-top:.16u dashed var(--navy2)}
.gu-note{font-size:.95u;font-weight:800;color:var(--navy2);text-align:center;line-height:1.2}

/* магазин */
.gu-tabs{display:flex;gap:.5u;padding:.7u .9u .2u;overflow-x:auto;flex:none;scrollbar-width:none;touch-action:pan-x}
.gu-tabs::-webkit-scrollbar{display:none}
.gu-tab{pointer-events:auto;cursor:pointer;flex:none;min-height:3u;padding:.3u 1.3u;background:var(--cream2);border:.18u solid var(--navy);border-radius:99u;font-size:1.05u;color:var(--navy);box-shadow:0 .25u 0 var(--navy);transition:transform .08s}
.gu-tab:active{transform:translateY(.18u)}
.gu-tab.sel{background:var(--teal);color:#fff;text-shadow:-.07u -.07u 0 var(--navy),.07u -.07u 0 var(--navy),-.07u .07u 0 var(--navy),.07u .07u 0 var(--navy)}
.gu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(9.6u,1fr));gap:.8u}
.gu-card{--rc:#8a93ad;position:relative;display:flex;flex-direction:column;align-items:stretch;gap:.4u;padding:.5u;background:#fff;border:.28u solid var(--rc);border-radius:1.2u;box-shadow:0 .28u 0 var(--rc)}
.gu-card.r-uncommon{--rc:#3ecf6a}.gu-card.r-rare{--rc:#3b9cff}.gu-card.r-epic{--rc:#a05cf0}
.gu-card.r-legendary{--rc:#ffb400;background:linear-gradient(160deg,#fff 40%,#fff1b8)}
.gu-card.eq{outline:.22u solid var(--green);outline-offset:.1u}
.gu-pv{position:relative;aspect-ratio:1/1;background:repeating-conic-gradient(#f3ead6 0 25%,#fff4e0 0 50%) 0 0/1.6u 1.6u;border:.14u solid var(--navy);border-radius:.8u;display:flex;align-items:center;justify-content:center;overflow:hidden}
.gu-pv svg{width:88%;height:88%}
.gu-rar{position:absolute;left:.3u;top:.3u;padding:.1u .5u;border-radius:99u;background:var(--rc);color:#fff;font-size:.62u;line-height:1.2;text-shadow:-.05u -.05u 0 var(--navy),.05u .05u 0 var(--navy)}
.gu-tick{position:absolute;right:.3u;top:.3u;width:1.8u;height:1.8u}
.gu-cname{font-size:.98u;line-height:1.1;text-align:center;min-height:2.1u;display:flex;align-items:center;justify-content:center}
.gu-price{display:flex;align-items:center;justify-content:center;gap:.35u;font-size:.9u;color:var(--navy2);min-height:1.5u;text-align:center}
.gu-price img{width:1.5u;height:1.5u;flex:none}
.gu-card .gu-btn{width:100%;min-height:2.8u;font-size:.95u;padding:.3u .5u;white-space:normal;line-height:1}
.gu-card .gu-btn img{width:1.6u;height:1.6u}
.gu-card .gu-lockrow{display:flex;align-items:center;justify-content:center;gap:.3u;min-height:2.8u;font-size:.8u;color:var(--navy2);text-align:center}
.gu-card .gu-lockrow img{width:1.6u;height:1.6u}
.gu-low .gu-grid{grid-template-columns:repeat(auto-fill,minmax(7.6u,1fr));gap:.6u}
.gu-low .gu-cname{min-height:1.6u;font-size:.85u}
.gu-low .gu-card .gu-btn{min-height:2.6u;font-size:.85u}
.gu-empty{padding:2u;text-align:center;color:var(--navy2);font-size:1.1u}

/* подарок */
.gu-days{display:grid;grid-template-columns:repeat(4,1fr);gap:.7u}
.gu-day{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:.2u;padding:.5u .3u .6u;min-height:7.2u;background:#fff;border:.22u solid var(--navy);border-radius:1.1u;box-shadow:0 .25u 0 var(--navy);text-align:center}
.gu-day.d7{grid-column:span 2;background:linear-gradient(160deg,#fff 30%,#ffe98f);border-color:#c78c00;box-shadow:0 .25u 0 #c78c00}
.gu-day.today{background:var(--yellow);animation:guPulse 1s ease-in-out infinite}
.gu-day.claimed{background:#d9f5e0}
.gu-day.locked{background:#ece4d3}
.gu-day .dn{font-size:.85u;color:var(--navy2)}
.gu-day .di{width:3u;height:3u;display:flex;align-items:center;justify-content:center}
.gu-day.d7 .di{width:3.8u;height:3.8u}
.gu-day .di img{width:100%;height:100%}
.gu-day .dl{font-size:.8u;line-height:1.1;font-weight:900;min-height:1.8u;display:flex;align-items:center}
.gu-day .ds{font-size:.7u;color:var(--coral)}
.gu-day .ck{position:absolute;right:-.5u;top:-.5u;width:2u;height:2u}
.gu-day.locked .di{filter:grayscale(.8);opacity:.7}
.gu-low .gu-foot{flex-direction:row;flex-wrap:wrap;justify-content:center;padding:.5u .8u .7u;gap:.5u .8u}
.gu-low .gu-foot .gu-note{width:100%}
.gu-low .gu-days{grid-template-columns:repeat(7,1fr);gap:.4u}
.gu-low .gu-day.d7{grid-column:auto}
.gu-low .gu-head{padding:.4u .6u .4u 1u}
.gu-low .gu-head h2{font-size:1.4u}
.gu-low .gu-body{padding:.7u}
.gu-low .gu-day{min-height:5.6u;padding:.3u .2u .4u}
.gu-low .gu-day .di{width:2.2u;height:2.2u}
.gu-low .gu-day.d7 .di{width:2.6u;height:2.6u}
.gu-low .gu-day .dl{min-height:1.2u;font-size:.7u}
.gu-gotbox{margin:.8u 0 0;padding:.7u 1u;border-radius:1u;background:var(--green);color:#fff;text-align:center;font-size:1.05u;animation:guPop .4s cubic-bezier(.2,1.6,.4,1);border:.18u solid var(--navy)}

/* настройки */
.gu-rows{display:flex;flex-direction:column;gap:.8u}
.gu-row{display:flex;align-items:center;gap:.9u;padding:.6u .9u;background:#fff;border:.2u solid var(--navy);border-radius:1.2u;font-size:1.25u;pointer-events:auto;cursor:pointer;min-height:3.6u;text-align:left;width:100%;box-shadow:0 .25u 0 var(--navy)}
.gu-row img{width:2.4u;height:2.4u;flex:none}
.gu-row span{flex:1}
.gu-row:active{transform:translateY(.2u);box-shadow:0 .05u 0 var(--navy)}
.gu-sw{flex:none!important;position:relative;width:4u;height:2.2u;border-radius:99u;background:#c5bba5;border:.18u solid var(--navy);transition:background .15s}
.gu-sw::after{content:'';position:absolute;left:.15u;top:50%;width:1.5u;height:1.5u;margin-top:-.75u;border-radius:50%;background:#fff;border:.14u solid var(--navy);transition:left .15s}
.gu-sw.on{background:var(--green)}.gu-sw.on::after{left:1.85u}

/* итог стрижки */
.gu-res{display:flex;flex-direction:column;align-items:center;gap:.9u;padding:1.1u 1.2u .9u;flex:1;min-height:0;overflow:auto}
.gu-res-l{display:flex;flex-direction:column;align-items:center;gap:.6u;min-width:0}
.gu-res-r{display:flex;flex-direction:column;align-items:center;gap:.8u;min-width:0;width:100%}
.gu-res .gu-mirror{width:8u;height:8u;border-width:.36u}
.gu-res-name{padding:.25u 1.1u;background:var(--yellow);border:.16u solid var(--navy);border-radius:99u;font-size:1.05u;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gu-res-say{position:relative;max-width:100%;padding:.6u 1u;background:#fff;border:.18u solid var(--navy);border-radius:1.2u;font-size:1u;font-weight:800;text-align:center;line-height:1.2}
.gu-stars{display:flex;gap:.4u;justify-content:center}
.gu-stars img{width:4.2u;height:4.2u}
.gu-stars .s{position:relative;width:4.2u;height:4.2u}
.gu-stars .s img{position:absolute;inset:0}
.gu-stars .s .on{opacity:0;transform:scale(.3)}
.gu-stars .s.lit .on{animation:guStar .55s cubic-bezier(.2,2.2,.4,1) forwards}
.gu-stars .s:nth-child(2){margin-top:-.5u}
.gu-sum{display:flex;flex-direction:column;gap:.45u;width:100%}
.gu-line{display:flex;align-items:center;gap:.7u;padding:.4u .9u;background:#fff;border:.18u solid var(--navy);border-radius:99u;font-size:1.1u;opacity:0;transform:translateX(2u);transition:opacity .25s,transform .35s cubic-bezier(.2,1.6,.4,1)}
.gu-line.in{opacity:1;transform:none}
.gu-line img{width:1.9u;height:1.9u;flex:none}
.gu-line span{flex:1}
.gu-line b{color:var(--green2);font-size:1.25u;font-variant-numeric:tabular-nums}
.gu-line.total{background:var(--yellow)}
.gu-perfect{white-space:nowrap;position:absolute;right:-.8u;top:2.4u;padding:.35u 1.1u;background:var(--coral);border:.2u solid var(--navy);border-radius:.8u;font-size:1.2u;transform:rotate(9deg);box-shadow:0 .28u 0 var(--navy);z-index:3;animation:guStamp .5s cubic-bezier(.2,1.8,.4,1) both;animation-delay:1.6s}
.gu-res-btn{width:100%}
.gu-res-btn .gu-btn{width:100%;animation:guPulse 1s ease-in-out infinite}
.gu-land .gu-res,.gu-low .gu-res{flex-direction:row;align-items:center;gap:1.4u}
.gu-land .gu-res-l,.gu-low .gu-res-l{width:34%;flex:none}
.gu-land .gu-res-r,.gu-low .gu-res-r{flex:1}
.gu-low .gu-res .gu-mirror{width:6.2u;height:6.2u}
.gu-low .gu-stars img,.gu-low .gu-stars .s{width:3.4u;height:3.4u}
.gu-low .gu-line{padding:.25u .7u;font-size:.9u;flex:1 1 auto;gap:.4u}
.gu-low .gu-line img{width:1.5u;height:1.5u}
.gu-low .gu-line b{font-size:1u}
.gu-low .gu-sum{flex-direction:row;flex-wrap:wrap;gap:.35u}
.gu-low .gu-res{padding:.7u 1u .7u;gap:1u}
.gu-low .gu-res-r{gap:.5u}
.gu-low .gu-res-say{font-size:.85u;padding:.4u .7u}
.gu-low .gu-res-r h3{font-size:1.4u!important}
.gu-low .gu-btn.big{min-height:3u;font-size:1.25u}

/* новый уровень / инструмент */
.gu-fest{position:relative;display:flex;flex-direction:column;align-items:center;gap:.9u;padding:1.4u 1.4u .8u;text-align:center;overflow:hidden}
.gu-rays{position:absolute;left:50%;top:0;width:30u;height:30u;margin:-9u 0 0 -15u;background:repeating-conic-gradient(rgba(255,210,63,.55) 0 10deg,rgba(255,210,63,0) 10deg 20deg);border-radius:50%;animation:guSpin 14s linear infinite;pointer-events:none;
  -webkit-mask-image:radial-gradient(circle,#000 25%,transparent 70%);mask-image:radial-gradient(circle,#000 25%,transparent 70%)}
.gu-fest>*{position:relative}
.gu-fest>.gu-rays{position:absolute}
.gu-fest h3{margin:0;font-size:1.9u;font-weight:1000;line-height:1.05;color:var(--coral);text-shadow:-.1u -.1u 0 var(--navy),.1u -.1u 0 var(--navy),-.1u .1u 0 var(--navy),.1u .1u 0 var(--navy),0 .25u 0 var(--navy)}
.gu-bigbadge{position:relative;width:9u;height:9u;display:flex;align-items:center;justify-content:center;animation:guBounce .8s cubic-bezier(.2,1.8,.4,1)}
.gu-bigbadge img{position:absolute;inset:0;width:100%;height:100%}
.gu-bigbadge b{position:relative;font-size:3.4u;margin-top:.7u}
.gu-unl{display:flex;flex-wrap:wrap;gap:.7u;justify-content:center;width:100%}
.gu-unl-i{display:flex;align-items:center;gap:.6u;padding:.4u 1.1u .4u .5u;background:#fff;border:.18u solid var(--navy);border-radius:99u;font-size:1.05u;animation:guPop .45s cubic-bezier(.2,1.6,.4,1) both}
.gu-unl-i img{width:2.6u;height:2.6u}
.gu-unl-i i{font-style:normal;font-size:2u;line-height:1}
.gu-tbig{position:relative;width:11u;height:11u;border-radius:50%;background:#bfe9ec;border:.4u solid var(--navy);box-shadow:0 0 0 .4u var(--yellow),0 0 0 .65u var(--navy);display:flex;align-items:center;justify-content:center;animation:guBounce .8s cubic-bezier(.2,1.8,.4,1)}
.gu-tbig img{width:7.5u;height:7.5u}
.gu-tbig i{font-style:normal;font-size:5u}
.gu-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.gu-conf i{position:absolute;top:-2u;width:.8u;height:1.3u;border-radius:.2u;animation:guConf linear forwards}
.gu-fest-r{display:contents}
.gu-fest h3{order:1}.gu-fest .gu-bigbadge,.gu-fest .gu-tbig{order:2}.gu-fest-r>:not(h3){order:3}
.gu-fest-list{display:flex;flex-direction:column;gap:.5u;align-items:center;width:100%}
.gu-fest-name{font-size:1.6u;font-weight:1000}
.gu-low .gu-fest{flex-direction:row;justify-content:center;gap:1.4u;padding:1u 1.4u}
.gu-low .gu-fest-r{display:flex;flex-direction:column;align-items:center;gap:.6u;flex:1;min-width:0}
.gu-low .gu-fest h3,.gu-low .gu-fest .gu-bigbadge,.gu-low .gu-fest .gu-tbig,.gu-low .gu-fest-r>:not(h3){order:0}
.gu-low .gu-fest h3{font-size:1.6u}
.gu-low .gu-bigbadge,.gu-low .gu-tbig{width:6.5u;height:6.5u}
.gu-low .gu-bigbadge b{font-size:2.4u}
.gu-low .gu-tbig img{width:4.6u;height:4.6u}

/* ---------- анимации ---------- */
@keyframes guPop{0%{transform:scale(.55) translateY(2u);opacity:0}60%{transform:scale(1.05);opacity:1}100%{transform:none;opacity:1}}
@keyframes guOut{to{transform:scale(.85);opacity:0}}
@keyframes guFade{from{opacity:0}to{opacity:1}}
@keyframes guJump{0%{transform:scale(1)}35%{transform:scale(1.22) translateY(-.3u)}100%{transform:scale(1)}}
@keyframes guPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes guBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-.3u)}}
@keyframes guDrop{from{transform:translateY(-2u) scale(.8);opacity:0}to{opacity:1}}
@keyframes guStar{0%{opacity:0;transform:scale(.3) rotate(-40deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes guStamp{from{opacity:0;transform:rotate(9deg) scale(2.2)}to{opacity:1;transform:rotate(9deg) scale(1)}}
@keyframes guBounce{0%{transform:scale(.2) rotate(-20deg)}100%{transform:scale(1) rotate(0)}}
@keyframes guSpin{to{transform:rotate(360deg)}}
@keyframes guConf{to{transform:translateY(60u) rotate(540deg);opacity:.8}}
/* картинки на кнопках длины (голова с нужной стрижкой) и на вкладках магазина */
.gu-len{justify-content:flex-start;gap:.3u;padding:0 .7u 0 .3u;min-height:3u;overflow:hidden}
.gu-len img.gu-len-pic{width:2.3u;height:2.3u;flex:none}
.gu-len.lock img.gu-len-pic{filter:grayscale(1);opacity:.5}
.gu-len img.gu-len-lock{position:absolute;left:1.3u;bottom:.1u;width:1.35u;height:1.35u}
.gu-len span{font-size:1u}
.gu-tall .gu-len{padding:0 .4u 0 .2u;gap:.15u}
.gu-tall .gu-len img.gu-len-pic{width:2u;height:2u}
.gu-tall .gu-len span{font-size:.82u}
/* строка вкладок листается: пальцем, перетаскиванием мышью и колесом; у края, за которым есть ещё вкладки, — плавное затухание */
.gu-tabs{gap:.45u;cursor:grab;pointer-events:auto;padding-bottom:.5u}
.gu-tabs.drag{cursor:grabbing}
.gu-tabs.drag .gu-tab{pointer-events:none}
.gu-tabs.fr{-webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 3u),transparent 100%);mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 3u),transparent 100%)}
.gu-tabs.fl{-webkit-mask-image:linear-gradient(270deg,#000 0,#000 calc(100% - 3u),transparent 100%);mask-image:linear-gradient(270deg,#000 0,#000 calc(100% - 3u),transparent 100%)}
.gu-tabs.fl.fr{-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 3u,#000 calc(100% - 3u),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 3u,#000 calc(100% - 3u),transparent 100%)}
.gu-tab{display:flex;align-items:center;gap:.35u;flex:none;padding:.2u 1.1u .2u .5u}
.gu-tab img.gu-tab-pic{width:2.3u;height:2.3u;flex:none}
.gu-tab span{white-space:nowrap}
/* рекорды: кнопка в зале и окно с таблицей */
.gu-side.rec{background:var(--yellow)}
.gu-rec-list{display:flex;flex-direction:column;gap:.45u}
.gu-rec-row{display:flex;align-items:center;gap:.6u;padding:.35u .8u .35u .5u;background:#fff;border:.18u solid var(--navy);border-radius:1.4u;box-shadow:0 .22u 0 var(--navy);font-size:1.1u;color:var(--navy)}
.gu-rec-row.me{background:var(--yellow)}
.gu-rec-rank{flex:none;width:2.1u;height:2.1u;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--cream2);border:.14u solid var(--navy);font-size:1u}
.gu-rec-row.top1 .gu-rec-rank{background:#ffd23f}
.gu-rec-row.top2 .gu-rec-rank{background:#d9e6ef}
.gu-rec-row.top3 .gu-rec-rank{background:#e8a26b}
.gu-rec-av{flex:none;width:2.4u;height:2.4u;border-radius:50%;overflow:hidden;background:var(--teal);border:.14u solid var(--navy);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:1.2u}
.gu-rec-av img{width:100%;height:100%;object-fit:cover;display:block}
.gu-rec-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:900}
.gu-rec-name i{font-style:normal;font-weight:800;color:var(--navy2)}
.gu-rec-score{flex:none;display:flex;align-items:center;gap:.25u;font-size:1.15u}
.gu-rec-score img{width:1.5u;height:1.5u}
.gu-rec-foot{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.5u 1u;padding:.6u 1u 1u;border-top:.14u dashed var(--navy2)}
.gu-rec-mine{display:flex;align-items:center;gap:.3u;font-size:1.1u;font-weight:900;color:var(--navy)}
.gu-rec-mine img{width:1.6u;height:1.6u}
.gu-rec-foot .gu-note{width:100%}
.gu-rec-foot .gu-btn{min-height:3u;font-size:1.1u;padding:.3u 1.6u}
/* ярость клиента */
.gu-rage{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-end;gap:.4u;transition:opacity .25s}
.gu-rage.calm0{opacity:.45}
.gu-rage-in{display:flex;flex-direction:column;gap:.15u}
.gu-rage-t{font-size:.9u;color:#fff;line-height:1}
.gu-rage-bar{height:1.3u;background:var(--cream);border:.18u solid var(--navy);border-radius:99u;overflow:hidden;box-shadow:0 .22u 0 var(--navy)}
.gu-rage-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd23f,#ff8a3d 55%,#ff2d3d);transition:width .25s}
.gu-rage.hot .gu-rage-bar{animation:guPulse .6s ease-in-out infinite}
.gu-calm{pointer-events:auto;min-height:2.8u;font-size:.9u;padding:.2u .7u;white-space:normal;line-height:1}
.gu-calm img{width:1.7u;height:1.7u;flex:none}
.gu-res-btn{display:flex;flex-wrap:wrap;gap:.6u;justify-content:center}
.gu-x2{min-height:3.4u;font-size:1.05u;padding:.3u 1u}
.gu-x2 img{width:1.9u;height:1.9u;flex:none}
.gu-adcash{display:flex;justify-content:center;padding:.1u .9u .5u;flex:none}
.gu-adcash .gu-btn{min-height:2.9u;font-size:1u;padding:.2u 1.1u}
.gu-adcash .gu-btn img{width:1.8u;height:1.8u;flex:none}
`;
    return raw.replace(/(-?\d*\.?\d+)u\b/g, 'calc($1*var(--u))');
})();
