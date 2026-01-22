// --- Web Audio API / BGM 設定 ---
let audioCtx;
let source;
let gainNode;
let audio;
let isInitialized = false;

function initAudio() {
    if (isInitialized) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audio = new Audio('audio/bgm.m4a'); 
    audio.loop = true;
    source = audioCtx.createMediaElementSource(audio);
    gainNode = audioCtx.createGain();
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    isInitialized = true;
}

window.startSite = function(isPlay) {
    const modal = document.getElementById('startModal');
    const bgmBtn = document.getElementById('bgmToggleBtn');

    initAudio();
    audioCtx.resume().then(() => {
        if (isPlay) {
            audio.play();
            updateBgmButton(true);
        } else {
            updateBgmButton(false);
        }
    });

    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        bgmBtn.style.display = 'block';
    }, 500);
};

window.toggleBgm = function() {
    if (!audio) return;
    if (audio.paused) {
        audio.play();
        updateBgmButton(true);
    } else {
        audio.pause();
        updateBgmButton(false);
    }
};

function updateBgmButton(isPlaying) {
    const btn = document.getElementById('bgmToggleBtn');
    if (isPlaying) {
        btn.innerHTML = '<span id="bgmIcon">🔊</span> ON';
    } else {
        btn.innerHTML = '<span id="bgmIcon">🔇</span> OFF';
    }
}

// --- 死期タイマー (静止画JPG版) ---
window.addEventListener('load', function() {
    const ASSETS_PATH = 'assets/timer/'; 
    const EXTENSION = '.png'; 

    let totalSeconds = (6 * 24 * 60 * 60) + (3 * 60 * 60); 
    const timerContainer = document.getElementById("deathTimer");
    const charImage = document.getElementById("charImage");

   // --- マウスイベントの登録 ---
    // キャラクター画像にマウスが乗ったら表示
    charImage.addEventListener('mouseenter', () => {
        timerContainer.classList.add('is-visible');
    });
    // マウスが離れたら非表示
    charImage.addEventListener('mouseleave', () => {
        timerContainer.classList.remove('is-visible');
    });

    // 右クリック禁止
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'IMG') e.preventDefault();
    }, false);

    function updateTimerDisplay() {
        if (totalSeconds > 0) totalSeconds--;

        const m = Math.floor(totalSeconds / (30 * 24 * 3600));
        let rem = totalSeconds % (30 * 24 * 3600);
        const d = Math.floor(rem / (24 * 3600));
        rem %= (24 * 3600);
        const h = Math.floor(rem / 3600);
        rem %= 3600;
        const min = Math.floor(rem / 60);
        const s = rem % 60;

        const timeStr = `${m}:${d}:${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

        if (timerContainer.childElementCount !== timeStr.length) {
            timerContainer.innerHTML = '';
            for (let i = 0; i < timeStr.length; i++) {
                const img = document.createElement('img');
                img.className = 'timer-img';
                timerContainer.appendChild(img);
            }
        }

        const imgElements = timerContainer.querySelectorAll('.timer-img');
        for (let i = 0; i < timeStr.length; i++) {
            const char = timeStr[i];
            const imgEl = imgElements[i];
            
            // 1. まずファイル名を決める
            let fileName = (char === ':') ? `colon${EXTENSION}` : `${char}${EXTENSION}`;
            
            // 2. フルパスを組み立てる (ここで let を使って定義)
            let fullPath = `${ASSETS_PATH}${fileName}`; 

            // 3. 画像の src を更新する
            if (!imgEl.src.includes(fileName)) {
                imgEl.src = fullPath;
                imgEl.alt = char;
            }
        }
    }

    setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
});

// --- キャラクター画像切り替え ---
let currentImgIndex = 1;
window.changeImage = function(dir) {
    currentImgIndex += dir;
    if (currentImgIndex > 2) currentImgIndex = 1; 
    if (currentImgIndex < 1) currentImgIndex = 2;
    document.getElementById('charImage').src = `images/kokorone${currentImgIndex}.png`;
};