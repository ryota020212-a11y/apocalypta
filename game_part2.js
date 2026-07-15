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

    if (p.type === "信徒" && p.evolutionLevel >= 1) {
        gameState.deadEliteBelievers[p.color]++;
        if (gameState.deadEliteBelievers[p.color] >= 2) {
            logMessage(`【連鎖崩壊】${p.color === 'white' ? '白' : '黒'}の狂信者が2体死亡したため外周縮小！`);
            shrinkBoard();
            gameState.deadEliteBelievers[p.color] = 0;
        }
    }
}

// 無限外周縮小システム
function shrinkBoard() {
    let min = gameState.minLimit;
    let max = gameState.maxLimit;

    for (let i = 0; i < BOARD_SIZE; i++) {
        if (board[min][i] && board[min][i] !== -1) onPieceDestroyed(board[min][i]);
        if (board[max][i] && board[max][i] !== -1) onPieceDestroyed(board[max][i]);
        if (board[i][min] && board[i][min] !== -1) onPieceDestroyed(board[i][min]);
        if (board[i][max] && board[i][max] !== -1) onPieceDestroyed(board[i][max]);
        board[min][i] = board[max][i] = board[i][min] = board[i][max] = -1;
    }

    gameState.minLimit++;
    gameState.maxLimit--;
    renderBoard();
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
function onCellClick(x, y) {
    if (!gameState.gameActive) return;

    if (movableCells.some(([mx, my]) => mx === x && my === y)) {
        let [sx, sy] = selectedCell;
        let p = board[sy][sx];
        let t = board[y][x];

        if (t && t !== -1) {
            let scoreValue = (t.type === "信徒" && t.evolutionLevel >= 1) ? 2 : PIECE_SCORES[t.type];
            gameState.playerScores[gameState.turnOwner] += scoreValue;
            onPieceDestroyed(t);

            if (gameState.apocalypseTriggeredTurn === 0 && gameState.playerScores[gameState.turnOwner] >= 20) {
                gameState.isApocalypseMode = true;
                gameState.apocalypseTimer = 3;
                gameState.apocalypseTriggeredTurn = gameState.currentTurn;
                for (let r of board) {
                    for (let c of r) {
                        if (c && c.type === "信徒" && c.evolutionLevel === 0) c.evolutionLevel = 1;
                    }
                }
                logMessage(`【アポカリプス発動】3手限定の全体覚醒！これより4ターン後に最初の外周縮小が発生します。`);
            }
        }

        if (p.type === "信徒" && gameState.isApocalypseMode && p.evolutionLevel < 3) {
            p.evolutionLevel++;
            logMessage(`【降臨】使徒が永久進化しました！`);
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

function logMessage(m) {
    let el = document.getElementById('log');
    if (el) {
        el.innerHTML += `<div>${m}</div>`;
        el.scrollTop = el.scrollHeight;
    }
}

// 起動スイッチ
window.onload = function() {
    document.getElementById('my-role').innerText = "対面マルチプレイ（1台操作）";
    initBoardData();
    renderBoard();
    initNetwork();
};
