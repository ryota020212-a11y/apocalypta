// ==========================================
// 【中編：game_part2.js】画面描画・進行・外周消滅
// ==========================================

// 盤面とデータを画面に組み立てる
function renderBoard() {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            let cellEl = document.createElement('div');
            let d = board[y][x];
            cellEl.className = `cell ${(x + y) % 2 === 0 ? 'light' : 'dark'}`;
            cellEl.dataset.x = x;
            cellEl.dataset.y = y;

            if (d === -1) {
                cellEl.classList.add('destroyed');
            } else if (d !== 0) {
                let pEl = document.createElement('div');
                pEl.className = `piece ${d.color}`;
                pEl.innerText = d.type === "信徒" ? ["信徒", "狂信者", "凶獣", "終末獣"][d.evolutionLevel] : d.type;
                if (d.evolutionLevel >= 1) pEl.classList.add('promoted');
                cellEl.appendChild(pEl);
            }
            cellEl.addEventListener('click', () => onCellClick(x, y));
            boardEl.appendChild(cellEl);
        }
    }

    // UIテキスト情報の上書き更新
    document.getElementById('turn-display').innerText = gameState.currentTurn;
    document.getElementById('white-score').innerText = gameState.playerScores.white;
    document.getElementById('black-score').innerText = gameState.playerScores.black;
    document.getElementById('turn-owner').innerText = gameState.turnOwner === 'white' ? '白' : '黒';
    document.getElementById('white-death-display').innerText = gameState.deadEliteBelievers.white;
    document.getElementById('black-death-display').innerText = gameState.deadEliteBelievers.black;
    document.getElementById('apocalypse-status').innerText = gameState.isApocalypseMode ? `【覚醒中 残り${gameState.apocalypseTimer}T】` : "";
    // 💡 【追加】持ち駒用UIエレメントがなければHTMLに自動作成
    let reserveEl = document.getElementById('reserve-panel');
    if (!reserveEl) {
        reserveEl = document.createElement('div');
        reserveEl.id = 'reserve-panel';
        reserveEl.style.cssText = "margin-top:15px; background:#222; padding:10px; border-radius:8px; border:1px solid #444; width:720px; display:flex; gap:10px; justify-content:center; align-items:center; font-size:13px;";
        document.body.appendChild(reserveEl);
    }
    
    // 持ち駒UIの描画リフレッシュ
    reserveEl.innerHTML = `<div>【持ち駒】</div>`;
    let currentReserves = gameState.capturedPieces[gameState.turnOwner];
    
    if (currentReserves.length === 0) {
        reserveEl.innerHTML += `<div style="color:#666;">（なし）</div>`;
    } else {
        currentReserves.forEach((piece, index) => {
            let pBtn = document.createElement('button');
            pBtn.innerText = piece.type;
            pBtn.style.cssText = "background:#34495e; border:1px solid #555; padding:4px 8px; color:white; border-radius:4px; cursor:pointer;";
            // 💡 現在選択中の持ち駒ならハイライト
            if (selectedCell && selectedCell[0] === 'reserve' && selectedCell[1] === index) {
                pBtn.style.background = "#f1c40f";
                pBtn.style.color = "#000";
            }
            pBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 盤面クリックとの衝突防止
                onReserveClick(index);
            });
            reserveEl.appendChild(pBtn);
        });
    }
}

function inBounds(x, y) {
    return x >= gameState.minLimit && x <= gameState.maxLimit && y >= gameState.minLimit && y <= gameState.maxLimit;
}

// 駒が死亡した時のスコア計算・ゲーム終了処理
function onPieceDestroyed(p) {
    if (!p || p === -1) return;
    logMessage(`【撃破】${p.color === 'white' ? '白' : '黒'}の[${p.type}]が消滅しました。`);

    if (p.type === "魔王") {
        gameState.gameActive = false;
        alert(`${p.color === 'white' ? '黒' : '白'}の勝利！魔王が消滅しました。`);
        return;
    }

    // 💡 【追加】倒した駒を持ち駒に加える（狂信者以上の場合はレベル0の「信徒」に戻す）
    if (gameState.gameActive) {
        let captured = {
            type: p.type,
            color: gameState.turnOwner, // 💡 所有権を「倒した側」の色に変える
            evolutionLevel: p.type === "信徒" ? 0 : 0, // 信徒はレベル0にリセット
            hasMoved: false
        };
        gameState.capturedPieces[gameState.turnOwner].push(captured);
        logMessage(`【持ち駒】${gameState.turnOwner === 'white' ? '白' : '黒'}が[${p.type}]を鹵獲しました。`);
    }

    if (p.type === "信徒" && p.evolutionLevel >= 1) {
        gameState.deadEliteBelievers[p.color]++;
        if (gameState.deadEliteBelievers[p.color] >= 2) {
            logMessage(`【連鎖崩壊】${p.color === 'white' ? '白' : '黒'}の狂信者が2体死亡したため外周縮小！`);
            shrinkBoard();
            gameState.deadEliteBelievers[p.color] = 0;
        }
    }
}

// ==========================================
// 【最適化版】無限外周縮小システム（持ち駒化防止・例外対策）
// ==========================================
function shrinkBoard() {
    // 💡 縮小処理がすでに実行中であれば、重複して実行しないようにガードする
    if (gameState.isShrinking) return;

    let min = gameState.minLimit;
    let max = gameState.maxLimit;

    // 💡 盤面が縮小しきっている、または不正な範囲の場合は安全のために処理しない
    if (min >= max) {
        logMessage("【システム】盤面はこれ以上縮小できません。");
        return;
    }

    gameState.isShrinking = true;

    try {
        // 重複を避けて外周の座標を厳密にリストアップ
        let targetCells = new Set();
        for (let i = min; i <= max; i++) {
            targetCells.add(`${min},${i}`); // 上辺
            targetCells.add(`${max},${i}`); // 下辺
            targetCells.add(`${i},${min}`); // 左辺
            targetCells.add(`${i},${max}`); // 右辺
        }

        // リストアップした外周マスの駒を処理
        targetCells.forEach(coord => {
            let [x, y] = coord.split(',').map(Number);
            let p = board[y][x];
            
            if (p && p !== -1) {
                // 💡 狂信者（進化した信徒）とそれ以外の駒でログを出し分ける
                if (p.type === "信徒" && p.evolutionLevel >= 1) {
                    logMessage(`【外周消滅】${p.color === 'white' ? '白' : '黒'}の[${p.type}]が暗黒空間に呑まれました。`);
                } else {
                    logMessage(`【外周消滅】${p.color === 'white' ? '白' : '黒'}の[${p.type}]が暗黒空間に呑まれました。`);
                    
                    // 💡 王（勝利条件に関わる重要な駒）が巻き込まれた場合の判定のみを行う
                    if (p.type === "王" || p.type === "王将") {
                        // 必要に応じて、ここにゲーム終了関数などを呼び出します
                        // checkGameEnd(p.color); 
                    }
                }
                
                // 💡 注意：誰の持ち駒にもさせないため、ここでは `onPieceDestroyed(p)` を呼び出しません。
                // 駒の参照をここで外すことで、ゲーム上から完全に消滅（ロスト）させます。
            }
            board[y][x] = -1; // 進入不可マス（暗黒空間）へ変更
        });

        gameState.minLimit++;
        gameState.maxLimit--;

    } finally {
        // 💡 処理中にエラーが発生しても、必ずガードを解除して画面を再描画する
        gameState.isShrinking = false;
        renderBoard();
    }
}



// 手番（ターン）経過処理
function advanceTurn() {
    gameState.currentTurn++;
    gameState.turnOwner = (gameState.turnOwner === 'white') ? 'black' : 'white';

    if (gameState.isApocalypseMode && --gameState.apocalypseTimer === 0) {
        gameState.isApocalypseMode = false;
        logMessage("アポカリプス終了。通常の性能に戻りました。");
    }

    if (gameState.apocalypseTriggeredTurn > 0 && gameState.currentTurn === gameState.apocalypseTriggeredTurn + 4) {
        logMessage(`【天災】20点到達から4ターン経過したため、定期外周縮小が発生！`);
        shrinkBoard();
    }
    renderBoard();
}

// マスクリック・移動・スコア完全加算処理
// ==========================================
// 【修正】onCellClick の先頭部分（通信・持ち駒エラーの解消）
// ==========================================
function onCellClick(x, y) {
    if (!gameState.gameActive) return;

// 💡 game_part2.js 内の onCellClick(x, y) の先頭にある3行を以下に書き換え
if (gameChannel && gameState.turnOwner !== myColor) {
    logMessage("【警告】相手の手番です。");
    return;
}

    // 💡 持ち駒を盤面に「打つ」時の配置処理（判定エラーの修正）
    if (selectedCell && selectedCell[0] === 'reserve') {
        if (movableCells.some(([mx, my]) => mx === x && my === y)) {
            let reserveIndex = selectedCell[1];
            let piece = gameState.capturedPieces[gameState.turnOwner][reserveIndex];
            
            board[y][x] = piece;
            gameState.capturedPieces[gameState.turnOwner].splice(reserveIndex, 1);
            
            selectedCell = null;
            movableCells = [];
            logMessage(`【配置】[${piece.type}]を盤面に召喚しました。`);
            
            advanceTurn();
            sendMove();
            return;
        }
    }

    // 💡 通常の駒の移動処理（selectedCellが配列のときだけ判定するようにガード）
    if (Array.isArray(selectedCell) && selectedCell[0] !== 'reserve' && movableCells.some(([mx, my]) => mx === x && my === y)) {
        let [sx, sy] = selectedCell;
        let p = board[sy][sx];
        let t = board[y][x];

        if (t && t !== -1) {
            let scoreValue = (t.type === "信徒" && t.evolutionLevel >= 1) ? 2 : PIECE_SCORES[t.type];
            gameState.playerScores[gameState.turnOwner] += scoreValue;
            onPieceDestroyed(t);

            if (gameState.playerScores[gameState.turnOwner] >= 20) {
                gameState.isApocalypseMode = true;
                gameState.apocalypseTimer = 3;
                gameState.apocalypseTriggeredTurn = gameState.currentTurn;
                gameState.playerScores[gameState.turnOwner] = 0; 
                
                for (let r of board) {
                    for (let c of r) {
                        if (c && c.type === "信徒" && c.evolutionLevel === 0 && c.color === gameState.turnOwner) {
                            c.evolutionLevel = 1;
                        }
                    }
                }
                logMessage(`【アポカリプス発動】3手限定の全体覚醒！${gameState.turnOwner === 'white' ? '白' : '黒'}のスコアが0にリセットされました。`);
            }
        }

        p.hasMoved = true;
        board[y][x] = p;
        board[sy][sx] = 0;
        selectedCell = null;
        movableCells = [];

        advanceTurn();
        sendMove();
        return;
    }

    // 駒の選択処理
    let c = board[y][x];
    if (c && c !== -1 && c.color === gameState.turnOwner) {
        selectedCell = [x, y];
        movableCells = getMovableCells(x, y);
        renderBoard();
        document.querySelector(`[data-x='${x}'][data-y='${y}']`).classList.add('selected');
        movableCells.forEach(([mx, my]) => {
            document.querySelector(`[data-x='${mx}'][data-y='${my}']`)?.classList.add('movable');
        });
    } else {
        selectedCell = null;
        movableCells = [];
        renderBoard();
    }
}

function onReserveClick(index) {
    if (!gameState.gameActive) return;
    if (peer && conn && conn.open && gameState.turnOwner !== myColor) return;

    // すでに選択中なら解除、そうでなければ選択
    if (selectedCell && selectedCell[0] === 'reserve' && selectedCell[1] === index) {
        selectedCell = null;
        movableCells = [];
        renderBoard();
        return;
    }

    selectedCell = ['reserve', index];
    movableCells = [];

    // 💡 「真ん中（y=8）よりも自陣側」かつ「空マス」かつ「消滅していないマス」を打てるマスとしてリストアップ
    // 白(white)は下半分（yが9〜16）、黒(black)は上半分（yが0〜7）
    for (let y = gameState.minLimit; y <= gameState.maxLimit; y++) {
        for (let x = gameState.minLimit; x <= gameState.maxLimit; x++) {
            if (board[y][x] === 0) { // 空マス限定
                if (gameState.turnOwner === 'white' && y >= 9) {
                    movableCells.push([x, y]);
                } else if (gameState.turnOwner === 'black' && y <= 7) {
                    movableCells.push([x, y]);
                }
            }
        }
    }

    renderBoard();

    // 打てるマスを緑色にハイライト
    movableCells.forEach(([mx, my]) => {
        document.querySelector(`[data-x='${mx}'][data-y='${my}']`)?.classList.add('movable');
    });
}
function logMessage(m) {
    let el = document.getElementById('log');
    if (el) {
        el.innerHTML += `<div>${m}</div>`;
        el.scrollTop = el.scrollHeight;
    }
}
