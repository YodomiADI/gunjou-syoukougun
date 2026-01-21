window.onload = function() {

// --- 設定定数 ---

const COLS = 12;
const ROWS = 13;
const TOTAL_FRAMES = 145;
const FPS = 30;

let currentFrame = 0;

const CHAR_FILE_MAP = {
    ':': '10',
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
};
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
    if (chars.length === 0) { // 要素がない時はスキップしてエラー防止
        requestAnimationFrame(animate);
        return;
    }

    // スプライトシート内の位置（列と行）を計算
    const col = currentFrame % COLS;
    const row = Math.floor(currentFrame / COLS);
    
    // パーセント指定での座標計算
    const posX = (col / (COLS - 1)) * 100;
    const posY = (row / (ROWS - 1)) * 100;

    // 全ての数字要素の背景位置を一斉に更新
    chars.forEach(el => {
        el.style.backgroundPosition = `${posX}% ${posY}%`;
    });

    // 次のフレームへ（145枚までいったら0に戻る）
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

            // 文字に対応するファイル名を取得（例：':'なら'10'）
            const fileNum = CHAR_FILE_MAP[char];
            // 画像パスを生成（※タイポに注意！ assets です）
            div.style.backgroundImage = `url('assets/timer/${fileNum}-sheet.png')`;
            
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
    updateTimerDisplay();
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