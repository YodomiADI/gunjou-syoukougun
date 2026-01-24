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

// --- 死期タイマー (静止画png版) ---
window.addEventListener('load', function() {
    const ASSETS_PATH = 'assets/timer/'; 
    const EXTENSION = '.png'; 
    const timerContainer = document.getElementById("deathTimer");
    const charImage = document.getElementById("charImage");

    // --- 設定値 ---
    let totalSeconds = (6 * 24 * 60 * 60) + (3 * 60 * 60); // 初期：6日3時間
    const LONG_LIFE_SECONDS = (43 * 365 * 24 * 60 * 60) + (241 * 24 * 60 * 60); // 変更後：約43年

    // --- 状態管理フラグ ---
    let isCaptured = false;     // マウスに捕まっているか（台風の目の中）
    let isFateChanged = false;  // 運命が書き換わった後か
    let isAnimating = false;    // 数字変動アニメーション中か

    // --- インタラクション設定 ---
    const REPULSION_PEAK_DIST = 50; // 数式の 'N'。最も強く反発する距離(px)
    const REPULSION_POWER = 50;     // 反発力の強さ係数
    const CAPTURE_RADIUS = 10;       // この距離内に入ったら捕まる(px)

    // --- 提案の数式に基づく反発力計算関数 ---
    function calculateRepulsion(distance, peakN) {
        const d = distance < 1 ? 1 : distance;
        return (2 * peakN * d) / (d * d + peakN * peakN);
    }

    // --- マウス移動イベント（個別逃走 ＆ 横棒判定） ---
    const HIT_BAR_HEIGHT = 15; // 透明な横棒の太さ（上下幅 px）
    const DIGIT_ESCAPE_POWER = 60; // 数字が逃げる強さ

    document.addEventListener('mousemove', (e) => {
        // 表示されていない、またはアニメーション中は計算しない
        if (!timerContainer.classList.contains('is-visible') || isAnimating) return;

        // 基準点（キャラクターの頭上）の計算
        const parentRect = charImage.parentElement.getBoundingClientRect();
        // 親要素の中心X (left: 20% に合わせる)
        const baseCenterX = parentRect.left + parentRect.width * 0.2;
        // 親要素の上から30%の位置Y（CSSのtop:30%に合わせる）
        const baseCenterY = parentRect.top + parentRect.height * 0.3;

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // --- 1. 捕まっている時（全体追従） ---
        if (isCaptured) {
            // 基準点からのズレを計算して、コンテナごと移動
            const dx = mouseX - baseCenterX;
            const dy = mouseY - baseCenterY;
            
            // コンテナをマウスに追従させる
            timerContainer.style.transform = `translateX(-50%) translate(${dx}px, ${dy}px)`;
            
            // 数字ごとのズレはリセット（整列させる）
            const wrappers = timerContainer.querySelectorAll('.digit-wrapper');
            wrappers.forEach(w => {
                w.style.transform = 'translate(0px, 0px)';
            });
            return;
        }

        // --- 2. 捕まっていない時（個別逃走） ---
        // コンテナ自体は基準位置から動かさない
        timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;

        const wrappers = timerContainer.querySelectorAll('.digit-wrapper');
        let caughtTrigger = false; // 誰か捕まったか？

        wrappers.forEach(wrapper => {
            const rect = wrapper.getBoundingClientRect();
            const digitCenterX = rect.left + rect.width / 2;
            const digitCenterY = rect.top + rect.height / 2;

            const dx = mouseX - digitCenterX;
            const dy = mouseY - digitCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // --- 透明な横棒の当たり判定 ---
            const isHitY = Math.abs(dy) < HIT_BAR_HEIGHT;
            const isHitX = Math.abs(dx) < (rect.width / 1.5); 

            if (isHitY && isHitX) {
                caughtTrigger = true;
            }

            // --- 個別に逃げる計算 ---
            const repulsion = calculateRepulsion(dist, 40); 
            
            const moveX = -dx * repulsion * (DIGIT_ESCAPE_POWER / (dist + 1));
            const moveY = -dy * repulsion * (DIGIT_ESCAPE_POWER / (dist + 1));

            wrapper.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });

        // 誰か一文字でも横棒に触れたら、全体が捕まる
        if (caughtTrigger) {
            isCaptured = true;
            timerContainer.classList.add('is-captured');
        }
    });

    // --- クリックイベント ---
    timerContainer.addEventListener('mousedown', (e) => {
        if (!isCaptured || isAnimating) return;

        if (!isFateChanged) {
            triggerFateChange();
        } else {
            triggerRevertFate();
        }
    });

    // --- 運命書き換えアニメーション関数 ---
    function triggerFateChange() {
        isCaptured = false;
        isFateChanged = true;
        isAnimating = true;
        timerContainer.classList.add('is-changing'); 

        let count = 0;
        const interval = setInterval(() => {
            const randomTime = Math.floor(Math.random() * LONG_LIFE_SECONDS);
            updateTimerDisplay(randomTime);
            
            count++;
            if (count > 20) { 
                clearInterval(interval);
                finalizeFate();
            }
        }, 50); 
    }

    // --- 運命確定処理 ---
    function finalizeFate() {
        timerContainer.classList.remove('is-changing');
        timerContainer.classList.add('fate-changed'); 
        totalSeconds = LONG_LIFE_SECONDS; 
        updateTimerDisplay(totalSeconds);
        isAnimating = false;

        setTimeout(() => {
             timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;
        }, 500);
    }

    // --- 運命を元に戻す（絶望）アニメーション関数 ---
    function triggerRevertFate() {
        isAnimating = true;
        timerContainer.classList.remove('fate-changed'); 
        timerContainer.classList.add('is-changing');    

        let count = 0;
        const interval = setInterval(() => {
            const randomTime = Math.floor(Math.random() * (12 * 24 * 60 * 60));
            updateTimerDisplay(randomTime);
        
            count++;
            if (count > 25) { 
                clearInterval(interval);
                finalizeRevert();
            }
        }, 40);
    }

    // --- 絶望確定処理 ---
    function finalizeRevert() {
        isFateChanged = false; 
        isCaptured = false;    
        timerContainer.classList.remove('is-changing');
    
        totalSeconds = (6 * 24 * 60 * 60) + (3 * 60 * 60); 
        updateTimerDisplay(totalSeconds);
        isAnimating = false;

        setTimeout(() => {
            timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;
        }, 500);
    }

    // --- [修正版] タイマー表示更新関数 ---
    // ここで <span> (digit-wrapper) を作る構造にしています
    function updateTimerDisplay(currentSeconds = totalSeconds) {
        if (!isAnimating && currentSeconds > 0 && currentSeconds === totalSeconds) {
                totalSeconds--;
                currentSeconds = totalSeconds;
        }

        const m = Math.floor(currentSeconds / (30 * 24 * 3600));
        let rem = currentSeconds % (30 * 24 * 3600);
        const d = Math.floor(rem / (24 * 3600));
        rem %= (24 * 3600);
        const h = Math.floor(rem / 3600);
        rem %= 3600;
        const min = Math.floor(rem / 60);
        const s = rem % 60;

        const timeStr = `${m}:${d}:${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

        // 構造が違う（桁数が変わった）場合は作り直し
        if (timerContainer.childElementCount !== timeStr.length) {
            timerContainer.innerHTML = '';
            for (let i = 0; i < timeStr.length; i++) {
                // 個別に動かすための透明な箱（ラッパー）を作る
                const wrapper = document.createElement('span');
                wrapper.className = 'digit-wrapper'; 
                
                const img = document.createElement('img');
                img.className = 'timer-img';
                
                wrapper.appendChild(img);
                timerContainer.appendChild(wrapper);
            }
        }

        // 画像のsrcを更新
        const wrappers = timerContainer.querySelectorAll('.digit-wrapper');
        for (let i = 0; i < timeStr.length; i++) {
            const char = timeStr[i];
            const imgEl = wrappers[i].querySelector('img'); 
            
            let fileName = (char === ':') ? `colon${EXTENSION}` : `${char}${EXTENSION}`;
            let fullPath = `${ASSETS_PATH}${fileName}`;

            if (!imgEl.src.includes(fileName)) {
                imgEl.src = fullPath;
                imgEl.alt = char;
            }
        }
    }

    // --- ホバー表示/非表示 ---
    charImage.addEventListener('mouseenter', () => {
        timerContainer.classList.add('is-visible');
    });
    
    charImage.addEventListener('mouseleave', () => {
        if (!isCaptured && !isAnimating) {
            timerContainer.classList.remove('is-visible');
            timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;
        }
    });

    // 右クリック禁止
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'IMG') e.preventDefault();
    }, false);

    // タイマースタート
    setInterval(() => updateTimerDisplay(), 1000);
    updateTimerDisplay();

}); // ← loadイベントの閉じカッコ

// --- キャラクター画像切り替え ---
let currentImgIndex = 1;
window.changeImage = function(dir) {
    currentImgIndex += dir;
    if (currentImgIndex > 2) currentImgIndex = 1; 
    if (currentImgIndex < 1) currentImgIndex = 2;
    document.getElementById('charImage').src = `images/kokorone${currentImgIndex}.png`;
};