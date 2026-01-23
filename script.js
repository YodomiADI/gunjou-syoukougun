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
    // y = (2Nx) / (x^2 + N^2)
    // x: 現在の距離, N: ピーク距離。戻り値は 0.0〜1.0 の範囲になる
    function calculateRepulsion(distance, peakN) {
        // 距離が0だとゼロ除算になるので微小な値を足す
        const d = distance < 1 ? 1 : distance;
        return (2 * peakN * d) / (d * d + peakN * peakN);
    }

    // --- マウス移動イベント（ふよふよ避ける＆捕まる処理） ---
    document.addEventListener('mousemove', (e) => {
        // 表示されていない、またはアニメーション中は計算しない
        if (!timerContainer.classList.contains('is-visible') || isAnimating) return;

        // タイマーの「本来あるべき中心位置」を算出
        // コンテナは left: 50%, top: 30% に配置されているので、そこを基準にする
        const parentRect = charImage.parentElement.getBoundingClientRect();
        const baseCenterX = parentRect.left + parentRect.width / 2;
        const baseCenterY = parentRect.top + parentRect.height * 0.3; // top: 30%
        
        // マウスと「基準位置」の距離
        const dx = e.clientX - baseCenterX;
        const dy = e.clientY - baseCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (isCaptured) {
            // 【台風の目】基準位置からのマウスのズレをそのまま適用（滑らかに追従）
            timerContainer.style.transform = `translateX(-50%) translate(${dx}px, ${dy}px)`;
            return;
        }

        // 捕獲判定：基準位置に十分近づいたらキャプチャ
        if (distance < CAPTURE_RADIUS) {
            isCaptured = true;
            timerContainer.classList.add('is-captured'); // CSS用
            return;
        }

        // 【回避行動】数式に基づいて避ける
        const repulsionStrength = calculateRepulsion(distance, REPULSION_PEAK_DIST);
        
        // 基準位置からマウスとは「逆方向」に押し出す
        // distanceが小さいほど大きく、離れると0に近づく
        const moveX = -dx * (repulsionStrength * REPULSION_POWER / (distance + 1));
        const moveY = -dy * (repulsionStrength * REPULSION_POWER / (distance + 1));

        timerContainer.style.transform = `translateX(-50%) translate(${moveX}px, ${moveY}px)`;
    });

    // --- クリックイベントも念のため調整 ---
    timerContainer.addEventListener('mousedown', (e) => {
        // 捕まっていない、またはアニメーション中は無視
        if (!isCaptured || isAnimating) return;

        if (!isFateChanged) {
            // まだ救っていないなら、救済（43年へ）
            triggerFateChange();
        } else {
            // すでに救済済みなら、絶望（6日へ戻す）
            triggerRevertFate();
        }
    });

    // --- 運命書き換えアニメーション関数 ---
    function triggerFateChange() {
        isCaptured = false;
        isFateChanged = true;
        isAnimating = true;
        timerContainer.classList.add('is-changing'); // ガガガッという演出クラス付与

        // パラパラ漫画のように数字をランダムに変動させる演出
        let count = 0;
        const interval = setInterval(() => {
            // 一時的にデタラメな大きな数字を表示
            const randomTime = Math.floor(Math.random() * LONG_LIFE_SECONDS);
            updateTimerDisplay(randomTime);
            
            count++;
            if (count > 20) { // 20回（約1秒間）変動させる
                clearInterval(interval);
                finalizeFate();
            }
        }, 50); // 0.05秒ごとに更新
    }

    // --- 運命確定処理 ---
    function finalizeFate() {
        timerContainer.classList.remove('is-changing');
        timerContainer.classList.add('fate-changed'); // 穏やかな光へ
        totalSeconds = LONG_LIFE_SECONDS; // 本来の（長い）寿命をセット
        updateTimerDisplay(totalSeconds);
        isAnimating = false;

        // 確定後、元の位置にスッと戻す演出
        setTimeout(() => {
             timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;
        }, 500);
    }

    // --- 運命を元に戻す（絶望）アニメーション関数 ---
    function triggerRevertFate() {
        isAnimating = true;
        timerContainer.classList.remove('fate-changed'); // 穏やかな光を消す
        timerContainer.classList.add('is-changing');    // ノイズ演出開始

        let count = 0;
        const interval = setInterval(() => {
            // 変動演出：短い寿命の範囲（0〜12日程度）で数字を暴れさせる
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
        isFateChanged = false; // 運命が変わっていない状態に戻す
        isCaptured = false;    // 捕獲を解除（ふよふよ逃げる状態へ）
        timerContainer.classList.remove('is-changing');
    
        totalSeconds = (6 * 24 * 60 * 60) + (3 * 60 * 60); // 元の6日3時間
        updateTimerDisplay(totalSeconds);
        isAnimating = false;

        // 元の位置にスッと戻す
        setTimeout(() => {
            timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;
        }, 500);
    }

    // --- タイマー表示更新関数（引数で時間を渡せるように変更） ---
    function updateTimerDisplay(currentSeconds = totalSeconds) {
        // 通常時は1秒減らす（アニメーション中は減らさない）
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

        // 年の表示も追加（43年とかになるので）
        // ※今回は簡易的に「月:日:時...」の先頭を年に見立てます。
        // 必要に応じて「年」の画像を追加したり、フォーマットを変えてください。
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
            let fileName = (char === ':') ? `colon${EXTENSION}` : `${char}${EXTENSION}`;
            let fullPath = `${ASSETS_PATH}${fileName}`;
            if (!imgEl.src.includes(fileName)) {
                imgEl.src = fullPath;
                imgEl.alt = char;
            }
        }
    }

   // --- マウスイベントの登録 ------ ホバー表示/非表示 ---
    // キャラクター画像にマウスが乗ったら表示
    charImage.addEventListener('mouseenter', () => {
        timerContainer.classList.add('is-visible');
    });
    // マウスが離れたら非表示
    charImage.addEventListener('mouseleave', () => {
        // 捕まっている最中やアニメーション中は消さない
        if (!isCaptured && !isAnimating) {
            timerContainer.classList.remove('is-visible');
            // 元の位置に戻す
            timerContainer.style.transform = `translateX(-50%) translate(0px, 0px)`;
        }
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