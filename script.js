window.onload = function() {

// --- 設定定数 ---
const FRAME_W = 512;
const COLS = 12;
const ROWS = 13;
const TOTAL_FRAMES = 145;
const FPS = 30;

let currentFrame = 0;
let totalSeconds = (6 * 24 * 60 * 60) + (3 * 60 * 60); // 6日3時間
const images = ["images/kokorone1.png", "images/kokorone2.png"];
let currentIndex = 0;

// DOM要素
const timerContainer = document.getElementById("deathTimer");
const charImage = document.getElementById("charImage");
const sliderContainer = document.querySelector(".slider-container");
const bgmBtn = document.getElementById("bgmToggleBtn");
const modal = document.getElementById("startModal");

// --- 1. スプライトアニメーション (パラパラ漫画) ---
function animate() {
    const chars = document.querySelectorAll('.sprite-char');
    
    const col = currentFrame % COLS;
    const row = Math.floor(currentFrame / COLS);
    
    // 背景位置のパーセント計算
    const posX = col * (100 / (COLS - 1));
    const posY = row * (100 / (ROWS - 1));

    chars.forEach(el => {
        el.style.backgroundPosition = `${posX}% ${posY}%`;
    });

    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
    
    setTimeout(() => {
        requestAnimationFrame(animate);
    }, 1000 / FPS);
}

// --- 2. タイマー表示の更新 (1秒ごとに呼ばれる) ---
function updateTimerDisplay() {
    if (totalSeconds > 0) totalSeconds--;

    // M:D:H:MM:SS 形式に変換
    const m = Math.floor(totalSeconds / (30 * 24 * 3600));
    let rem = totalSeconds % (30 * 24 * 3600);
    const d = Math.floor(rem / (24 * 3600));
    rem %= (24 * 3600);
    const h = Math.floor(rem / 3600);
    rem %= 3600;
    const min = Math.floor(rem / 60);
    const s = rem % 60;

    const timeStr = `${m}:${d}:${h}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    // 文字列が変わった時だけ要素を再生成
    if (timerContainer.dataset.lastTime !== timeStr) {
        timerContainer.innerHTML = '';
        for (let char of timeStr) {
            const div = document.createElement('div');
            div.className = 'sprite-char';
            if (char === ':') {
                div.style.backgroundImage = "url('assets/timer/colon.webp')";
            } else {
                div.style.backgroundImage = `url('assets/timer/num${char}.webp')`;
            }
            timerContainer.appendChild(div);
        }
        timerContainer.dataset.lastTime = timeStr;
    }
}

// --- 3. 観測システム (長押し/マウスホバー) ---
function startObserving(e) {
    if(e && e.type === 'touchstart' && e.cancelable) e.preventDefault();
    timerContainer.classList.add("visible");
}
function stopObserving() {
    timerContainer.classList.remove("visible");
}

// --- 4. BGM・スライダーなどの既存機能 ---
// (ここに以前の startSite, playBgm, changeImage 等の関数をそのまま入れます)
function changeImage(direction) {
    currentIndex = (currentIndex + direction + images.length) % images.length;
    charImage.src = images[currentIndex];
}

let audioContext, bgmSource, bgmBuffer, isPlaying = false;
const bgmUrl = 'audio/bgm.m4a';

async function startSite(allowMusic) {
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.display = 'none'; bgmBtn.style.display = 'block'; }, 500);
    if (allowMusic) { await loadAudio(); playBgm(); }
}

async function loadAudio() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        const response = await fetch(bgmUrl);
        const arrayBuffer = await response.arrayBuffer();
        bgmBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (e) { console.error(e); }
}

function playBgm() {
    if (!bgmBuffer) return;
    if (audioContext.state === 'suspended') audioContext.resume();
    bgmSource = audioContext.createBufferSource();
    bgmSource.buffer = bgmBuffer;
    bgmSource.loop = true;
    bgmSource.connect(audioContext.destination);
    bgmSource.start(0);
    isPlaying = true;
    updateBtnView(true);
}

function stopBgm() {
    if (bgmSource) { bgmSource.stop(); bgmSource = null; }
    isPlaying = false;
    updateBtnView(false);
}

function toggleBgm() { if (isPlaying) stopBgm(); else playBgm(); }
function updateBtnView(on) {
    bgmBtn.innerHTML = on ? '<span style="color:#93c5fd;">🔊</span> ON' : '<span style="color:#64748b;">🔇</span> OFF';
}

// 最後に実行開始の命令を入れる
    setInterval(updateTimerDisplay, 1000);
    animate(); // パラパラアニメ開始

// --- 5. イベント登録と実行開始 ---
sliderContainer.addEventListener("mouseenter", startObserving);
sliderContainer.addEventListener("mouseleave", stopObserving);
sliderContainer.addEventListener("touchstart", startObserving, {passive: false});
sliderContainer.addEventListener("touchend", stopObserving);

// script.js内から呼び出せるようにグローバルに関数を公開（ボタンonclick用）
    window.startSite = startSite;
    window.toggleBgm = toggleBgm;
    window.changeImage = changeImage;
};