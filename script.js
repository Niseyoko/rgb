/**
 * 16進数カラーコードをRGBの配列に変換する関数
 * @param {string} hex - #RRGGBB形式のカラーコード
 * @returns {number[]} - [R, G, B] の配列 (各値は0-255)
 */
function hexToRgb(hex) {
    // #を取り除き、16進数の文字列を数値に変換
    const bigint = parseInt(hex.slice(1), 16);
    // ビットシフトとAND演算子を使ってR, G, Bの値を抽出
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}

/**
 * RGB値をHSL値に変換する関数
 * @param {number} r - 赤の値 (0-255)
 * @param {number} g - 緑の値 (0-255)
 * @param {number} b - 青の値 (0-255)
 * @returns {number[]} - [H, S, L] の配列 (H: 0-360, S: 0-100, L: 0-100)
 */
function rgbToHsl(r, g, b) {
    // RGBを0-1の範囲に正規化
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        // 無彩色（グレー）の場合
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    // HSL値をそれぞれの範囲に合わせて返す
    return [h * 360, s * 100, l * 100];
}

/**
 * ランダムな色を生成する関数
 * @returns {[string, number, number, number]} - [16進数コード, R値, G値, B値]
 */
function generateRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    // 各値を16進数に変換し、1桁の場合は`padStart`で0を補完して2桁にする
    const hexR = r.toString(16).padStart(2, '0');
    const hexG = g.toString(16).padStart(2, '0');
    const hexB = b.toString(16).padStart(2, '0');
    return [`#${hexR}${hexG}${hexB}`.toUpperCase(), r, g, b];
}

// グローバル変数の定義
const numQuestions = 10; // 問題数
let questions = []; // 正解の色情報を格納する配列
let answers = [];   // ユーザーの回答を格納する配列
const questionArea = document.getElementById('question-area');
const submitButton = document.getElementById('submit-button');
const resultArea = document.getElementById('result-area');
const rgbErrorSpan = document.getElementById('rgb-error');
const hslErrorSpan = document.getElementById('hsl-error');
const rmseScoreSpan = document.getElementById('rmse-score');
const retryButton = document.getElementById('retry-button');

/**
 * テストのセットアップを行う関数
 * 問題を生成し、画面に表示する
 */
function setupQuestions() {
    // 初期化処理
    questionArea.innerHTML = '';
    questions = [];
    answers = Array(numQuestions).fill(''); // 回答配列を空にする
    resultArea.style.display = 'none'; // 結果エリアを非表示に
    submitButton.disabled = true; // 送信ボタンを無効に

    // 問題数分だけループして問題を作成
    for (let i = 0; i < numQuestions; i++) {
        const [hex, r, g, b] = generateRandomColor();
        questions.push({ hex, r, g, b }); // 正解データを保存

        // 問題表示用のHTML要素を作成
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question');
        questionDiv.innerHTML = `
            <div class="color-box" style="background-color: ${hex};"></div>
            <label for="answer-${i}">質問 ${i + 1}: </label>
            <input type="text" id="answer-${i}" class="answer-input" placeholder="RRGGBB" maxlength="6" autocomplete="off">
        `;
        questionArea.appendChild(questionDiv);
    }

    // すべての入力欄を取得
    const answerInputs = document.querySelectorAll('.answer-input');
    // 各入力欄にイベントリスナーを追加
    answerInputs.forEach((input) => {
        input.addEventListener('input', () => {
            // すべての入力欄が6文字（RRGGBB）で埋まっているかチェック
            const allFilled = Array.from(answerInputs).every(inp => inp.value.length === 6);
            // 条件を満たせば送信ボタンを有効化
            submitButton.disabled = !allFilled;
        });
    });
}

/**
 * 成績を計算して表示する関数
 */
function calculateScore() {
    let totalRgbError = [0, 0, 0]; // [Rの誤差合計, Gの誤差合計, Bの誤差合計]
    let totalHslError = [0, 0, 0]; // [Hの誤差合計, Sの誤差合計, Lの誤差合計]
    let squaredErrors = []; // RGBの二乗誤差を格納する配列 (RMSE計算用)

    // 各問題についてループ
    for (let i = 0; i < numQuestions; i++) {
        const correctAnswerRgb = [questions[i].r, questions[i].g, questions[i].b];
        // 入力値がない場合は"#000000"として処理
        const userAnswerHex = "#" + (document.getElementById(`answer-${i}`).value || "000000");
        const userAnswerRgb = hexToRgb(userAnswerHex);

        const correctAnswerHsl = rgbToHsl(...correctAnswerRgb);
        const userAnswerHsl = rgbToHsl(...userAnswerRgb);

        // RGBとHSLそれぞれの誤差を計算
        for (let j = 0; j < 3; j++) {
            // 1. RGBの誤差を正規化 (-1から1の範囲)
            const rgbError = (userAnswerRgb[j] - correctAnswerRgb[j]) / 255;
            totalRgbError[j] += rgbError;
            squaredErrors.push(rgbError ** 2); // RMSE計算のために二乗誤差を保存

            // 2. HSLの誤差を正規化
            let hslError;
            if (j === 0) { // 色相(Hue)の場合
                // 360度の円環なので、最短距離を誤差とする (例: 10度と350度の差は20度)
                const diff = Math.abs(userAnswerHsl[j] - correctAnswerHsl[j]);
                const shortestDiff = Math.min(diff, 360 - diff);
                hslError = shortestDiff / 180; // 0から1の範囲に正規化 (最大誤差は180度)
            } else { // 彩度(Saturation)と輝度(Lightness)の場合
                hslError = (userAnswerHsl[j] - correctAnswerHsl[j]) / 100; // -1から1の範囲に正規化
            }
            totalHslError[j] += hslError;
        }
    }

    // 3. 最終的な成績を計算
    // RGB平均誤差 (%)
    const avgRgbError = totalRgbError.map(error => (error / numQuestions) * 100);
    // HSL平均誤差 (%)
    const avgHslError = totalHslError.map(error => (error / numQuestions) * 100);
    // 絶対RGB感スコア (平均二乗誤差をパーセント化)
    const meanSquaredError = squaredErrors.reduce((sum, error) => sum + error, 0) / squaredErrors.length;
    const rmse = Math.sqrt(meanSquaredError) * 100; // RMSEをパーセント化

    // 結果を画面に表示
    rgbErrorSpan.textContent = `R: ${avgRgbError[0].toFixed(2)}%, G: ${avgRgbError[1].toFixed(2)}%, B: ${avgRgbError[2].toFixed(2)}%`;
    hslErrorSpan.textContent = `H: ${avgHslError[0].toFixed(2)}%, S: ${avgHslError[1].toFixed(2)}%, L: ${avgHslError[2].toFixed(2)}%`;
    rmseScoreSpan.textContent = rmse.toFixed(4); // 小数点以下4桁で表示
    resultArea.style.display = 'block'; // 結果エリアを表示
}

// 送信ボタンがクリックされたときの処理
submitButton.addEventListener('click', calculateScore);

// 再挑戦ボタンがクリックされたときの処理
retryButton.addEventListener('click', setupQuestions);

// ページ読み込み時にテストを初期化
setupQuestions();