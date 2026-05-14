
/*Water Ripple Effect
-----------------------------------------------------------------------
 Original Work:
 Copyright (c) 2026 by Divinector (https://codepen.io/divinector/pen/GaBOzP)
 Modified by YodmiDomi (2026)
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
----------------------------------------------------------------------- 
 */

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

// --- 死期タイマー (静止画png版) & 運命干渉ロジック ---
window.addEventListener('load', function() {
    const ASSETS_PATH = 'assets/timer/'; 
    const EXTENSION = '.png'; 
    const timerContainer = document.getElementById("deathTimer");
    const charImage = document.getElementById("charImage");
    const originalParent = charImage.parentElement; // 儀式終了後に元の場所に戻すため記憶

    // --- 運命干渉用 UI要素 ---
    const overlay = document.getElementById('intervention-overlay');
    const guideList = document.getElementById('intervention-guide');
    const focusedContainer = document.getElementById('focused-char-container');
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // --- 設定値 ---
    let totalSeconds = (6 * 24 * 60 * 60) + (3 * 60 * 60); // 初期：6日3時間
    const LONG_LIFE_SECONDS = (43 * 365 * 24 * 60 * 60) + (241 * 24 * 60 * 60); // 変更後：約43年

    // --- 状態管理フラグ ---
    let isCaptured = false;    // 捕まっているか
    let isFateChanged = false;  // 運命が書き換わった後か
    let isAnimating = false;    // 数字変動アニメーション中か

    // --- インタラクション設定 ---
    const REPULSION_PEAK_DIST = 50; 
    const REPULSION_POWER = 50;    
    const CAPTURE_RADIUS = 10;      

    function calculateRepulsion(distance, peakN) {
        const d = distance < 1 ? 1 : distance;
        return (2 * peakN * d) / (d * d + peakN * peakN);
    }

    // ★追加：マウスとタッチの座標を共通で取得するヘルパー関数
    function getEventPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    // --- マウス/タッチ 移動イベント ---
    const HIT_BAR_HEIGHT = 15; 
    const DIGIT_ESCAPE_POWER = 60; 

    function handleMove(e) {
        if (!timerContainer.classList.contains('is-visible') || isAnimating) return;

        const parentRect = charImage.parentElement.getBoundingClientRect();
        const baseCenterX = parentRect.left + parentRect.width * 0.2;
        const baseCenterY = parentRect.top + parentRect.height * 0.3;

        // タッチとマウスの両方に対応
        const pos = getEventPos(e);
        const targetX = pos.x;
        const targetY = pos.y;

        if (isCaptured) {
            const dx = targetX - baseCenterX;
            const dy = targetY - baseCenterY;
            timerContainer.style.transform = `translateX(-50%) translate(${dx}px, ${dy}px)`;
            
            const wrappers = timerContainer.querySelectorAll('.digit-wrapper');
            wrappers.forEach(w => w.style.transform = 'translate(0px, 0px)');
            return;
        }

        timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;
        const wrappers = timerContainer.querySelectorAll('.digit-wrapper');
        let caughtTrigger = false; 

        wrappers.forEach(wrapper => {
            const rect = wrapper.getBoundingClientRect();
            const digitCenterX = rect.left + rect.width / 2;
            const digitCenterY = rect.top + rect.height / 2;

            const dx = targetX - digitCenterX;
            const dy = targetY - digitCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const isHitY = Math.abs(dy) < HIT_BAR_HEIGHT;
            const isHitX = Math.abs(dx) < (rect.width / 1.5); 

            if (isHitY && isHitX) {
                caughtTrigger = true;
            }

            const repulsion = calculateRepulsion(dist, 40); 
            const moveX = -dx * repulsion * (DIGIT_ESCAPE_POWER / (dist + 1));
            const moveY = -dy * repulsion * (DIGIT_ESCAPE_POWER / (dist + 1));

            wrapper.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });

        if (caughtTrigger) {
            isCaptured = true;
            timerContainer.classList.add('is-captured');
        }
    }

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: true }); // スマホ対応

    // --- 捕獲・クリック/タッチイベント ---
    function handleCapture(e) {
        if (!isCaptured || isAnimating) return;
        if (!isFateChanged) {
            triggerFateChange();
        } else {
            triggerRevertFate();
        }
    }

    timerContainer.addEventListener('mousedown', handleCapture);
    timerContainer.addEventListener('touchend', handleCapture); // スマホ対応

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

    function finalizeFate() {
        timerContainer.classList.remove('is-changing');
        timerContainer.classList.add('fate-changed'); 
        totalSeconds = LONG_LIFE_SECONDS; 
        updateTimerDisplay(totalSeconds);
        isAnimating = false;

        setTimeout(() => {
             timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;
             
             // ★運命が変わったら儀式モードを終了する
             if (overlay && overlay.classList.contains('is-active')) {
                 window.endIntervention();
             }
        }, 800); // 余韻を持たせてオーバーレイを閉じる
    }

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

    // --- タイマー表示更新関数 ---
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

        if (timerContainer.childElementCount !== timeStr.length) {
            timerContainer.innerHTML = '';
            for (let i = 0; i < timeStr.length; i++) {
                const wrapper = document.createElement('span');
                wrapper.className = 'digit-wrapper'; 
                
                const img = document.createElement('img');
                img.className = 'timer-img';
                
                wrapper.appendChild(img);
                timerContainer.appendChild(wrapper);
            }
        }

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

    // --- ホバー & タッチによる表示制御 ---
    charImage.addEventListener('mouseenter', () => {
        timerContainer.classList.add('is-visible');
    });
    
    charImage.addEventListener('mouseleave', () => {
        // 儀式中（オーバーレイ展開中）は消さない
        if (overlay && overlay.classList.contains('is-active')) return;
        
        if (!isCaptured && !isAnimating) {
            timerContainer.classList.remove('is-visible');
            timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;
        }
    });

    // ★スマホ用：画像をタップしたらタイマーを表示
    charImage.addEventListener('touchstart', () => {
        timerContainer.classList.add('is-visible');
    }, { passive: true });

    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'IMG') e.preventDefault();
    }, false);

    setInterval(() => updateTimerDisplay(), 1000);
    updateTimerDisplay();

    // ============================================
    // 運命干渉モードの起動・終了ロジック
    // ============================================
    window.startIntervention = function() {
        if (!overlay) return;
        
        // 1. スクロールをロック
        document.body.classList.add('lock-scroll');
        
        // 2. ガイドテキストをデバイス別にセット
        guideList.innerHTML = '';
        const instructions = isTouchDevice ? [
            "一、画像をタップし、死期を暴け",
            "二、逃げる数字を指で追い詰めよ",
            "三、指を離し、運命を定着させよ"
        ] : [
            "一、画像に触れ、死期を暴け",
            "二、逃げる数字をマウスで追え",
            "三、左クリックで運命を書き換えよ"
        ];

        instructions.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            guideList.appendChild(li);
        });

        // 3. 画像とタイマーを一時的にオーバーレイ内へ移動
        focusedContainer.appendChild(charImage);
        focusedContainer.appendChild(timerContainer);
        
        // 4. オーバーレイを表示
        overlay.classList.add('is-active');
    };

    window.endIntervention = function() {
        if (!overlay) return;

        // 1. オーバーレイを消す
        overlay.classList.remove('is-active');
        document.body.classList.remove('lock-scroll');
        
        // 2. 画像とタイマーを元の場所へ帰す
        originalParent.appendChild(charImage);
        originalParent.appendChild(timerContainer);

        // ※儀式終了後は常に死期を表示させたままにする（変更後）
        timerContainer.classList.add('is-visible');
    };

    // 儀式中断ボタンの動作
    const closeBtn = document.getElementById('close-overlay');
    if (closeBtn) closeBtn.addEventListener('click', window.endIntervention);

}); 

// --- キャラクター画像切り替え ---
let currentImgIndex = 1;
window.changeImage = function(dir) {
    currentImgIndex += dir;
    if (currentImgIndex > 2) currentImgIndex = 1; 
    if (currentImgIndex < 1) currentImgIndex = 2;
    document.getElementById('charImage').src = `images/kokorone${currentImgIndex}.png`;
};

//Water Ripple Effect
// --- 背景の水面波紋エフェクト ---
$(document).ready(function() {
    try {
        $('body').ripples({
            resolution: 512,
            dropRadius: 20,       // 波紋の大きさ
            perturbance: 0.04,    // 水の揺らぎの強さ
        });
    } catch (e) {
        console.error("WebGLがサポートされていないか、エラーが発生しました: ", e);
    }
});