// ==========================================
// 【後編：game_part3.js（前半）】各駒の移動・射程計算
// ==========================================

function getMovableCells(sx, sy) {
    let p = board[sy][sx]; if (!p) return [];
    let cells = [], dirs = [], max = 1, jump = false, apo = gameState.isApocalypseMode;
    // 1. 使徒（信徒）系の移動・捕獲ロジック（ずっと2マス移動可能版）
    if (p.type === "信徒") {
        let f = p.color === 'white' ? -1 : 1;

        // 【全共通】正面1マスおよび2マスの前進（いつでも2マス移動可能・空マス限定）
        if (inBounds(sx, sy + f) && board[sy + f][sx] === 0) {
            cells.push([sx, sy + f]);
            // 💡 「!p.hasMoved」の条件を消したため、1回動いた後でも、進化後でも、いつでも正面2マスへ進めます
            if (inBounds(sx, sy + f * 2) && board[sy + f * 2][sx] === 0) {
                cells.push([sx, sy + f * 2]);
            }
        }

        // 【信徒（0）】または【狂信者（1）】
        if (p.evolutionLevel <= 1) {
            // 斜め前1マスの敵を捕獲
            for (let x of [sx - 1, sx + 1]) {
                if (inBounds(x, sy + f) && board[sy + f][x] && board[sy + f][x] !== -1 && board[sy + f][x].color !== p.color) {
                    cells.push([x, sy + f]);
                }
            }
            // 【狂信者（1）】は正面1マスの敵も捕獲可能
            if (p.evolutionLevel === 1 && inBounds(sx, sy + f) && board[sy + f][sx] && board[sy + f][sx] !== -1 && board[sy + f][sx].color !== p.color) {
                cells.push([sx, sy + f]);
            }
        } 
        // 【凶獣（2）】
        else if (p.evolutionLevel === 2) {
            // 正面・斜め前の3マスに敵がいれば捕獲可能
            for (let dx of [-1, 0, 1]) {
                if (inBounds(sx + dx, sy + f) && board[sy + f][sx + dx] && board[sy + f][sx + dx] !== -1 && board[sy + f][sx + dx].color !== p.color) {
                    cells.push([sx + dx, sy + f]);
                }
            }
            // 左右、および真後ろへの移動・捕獲（空マスまたは敵の駒）
            for (let [dx, dy] of [[-1, 0], [1, 0], [0, -f]]) {
                let tx = sx + dx, ty = sy + dy;
                if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) {
                    cells.push([tx, ty]);
                }
            }
        } 
        // 【終末の獣（3）】
        else if (p.evolutionLevel === 3) {
            // 前後左右1マスへの移動・捕獲
            for (let [dx, dy] of [[0, f], [-1, 0], [1, 0], [0, -f]]) {
                let tx = sx + dx, ty = sy + dy;
                if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) {
                    cells.push([tx, ty]);
                }
            }
            // 斜め前1マスの敵を捕獲
            for (let dx of [-1, 1]) {
                if (inBounds(sx + dx, sy + f) && board[sy + f][sx + dx] && board[sy + f][sx + dx] !== -1 && board[sy + f][sx + dx].color !== p.color) {
                    cells.push([sx + dx, sy + f]);
                }
            }
            // 前後左右へ2マス先へのジャンプ移動・捕獲（途中の障害物を無視）
            for (let [dx, dy] of [[0, f * 2], [0, -f * 2], [-2, 0], [2, 0]]) {
                let tx = sx + dx, ty = sy + dy;
                if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) {
                    // 通常の歩進ルールで追加された正面2マスの座標と、大ジャンプの重複を防ぐ
                    if (!cells.some(([cx, cy]) => cx === tx && cy === ty)) {
                        cells.push([tx, ty]);
                    }
                }
            }
        }
        return cells;
    }
    
    // 2. 通常駒の方向ベクトルと歩数の定義
    if (p.type === "魔王") { dirs = [[0,-1], [0,1], [-1,0], [1,0], [1,-1], [1,1], [-1,-1], [-1,1]]; max = 1; } 
    else if (p.type === "天使") { dirs = [[1,-1], [1,1], [-1,-1], [-1,1]]; max = 17; } 
    else if (p.type === "堕天使") { dirs = [[0,-1], [0,1], [-1,0], [1,0], [1,-1], [1,1], [-1,-1], [-1,1]]; max = apo ? 6 : 4; } 
    else if (p.type === "審問官") { dirs = [[0,-1], [0,1], [-1,0], [1,0]]; max = apo ? 9 : 6; } 
    else if (p.type === "龍王") { 
        let r = apo ? 6 : 4;
        for (let dx of [-1, 0, 1]) {
            for (let dyDir of [-1, 1]) { 
                for (let s = 1; s <= r; s++) {
                    let tx = sx + dx, ty = sy + (dyDir * s);
                    if (!inBounds(tx, ty)) break;
                    let t = board[ty][tx];
                    if (t === -1) break; 
                    if (t === 0) {
                        cells.push([tx, ty]);
                    } else {
                        if (t.color !== p.color) cells.push([tx, ty]); 
                        break; // 駒にぶつかったらその列は突進遮断
                    }
                }
            }
        }
        for (let [dx, dy] of [[0,-1], [0,1], [-1,0], [1,0]]) {
            let tx = sx + dx, ty = sy + dy;
            if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) {
                if (!cells.some(([cx, cy]) => cx === tx && cy === ty)) cells.push([tx, ty]);
            }
        }
        return cells;
    } 
    
    // 【修正】星喰い：横3列への突進（障害物・消滅マスで横進を遮断する処理を追加）
    else if (p.type === "星喰い") { 
        let r = apo ? 6 : 4;
        for (let dy of [-1, 0, 1]) {
            for (let dxDir of [-1, 1]) { 
                for (let s = 1; s <= r; s++) {
                    let tx = sx + (dxDir * s), ty = sy + dy;
                    if (!inBounds(tx, ty)) break;
                    let t = board[ty][tx];
                    if (t === -1) break; 
                    if (t === 0) {
                        cells.push([tx, ty]);
                    } else {
                        if (t.color !== p.color) cells.push([tx, ty]); 
                        break; // 駒にぶつかったらその行は突進遮断
                    }
                }
            }
        }
        for (let [dx, dy] of [[0,-1], [0,1], [-1,0], [1,0]]) {
            let tx = sx + dx, ty = sy + dy;
            if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) {
                if (!cells.some(([cx, cy]) => cx === tx && cy === ty)) cells.push([tx, ty]);
            }
        }
        return cells;
    } 
    
    // 【修正】死神：消滅マス（-1）の飛び越し・進入を不可にする
    else if (p.type === "死神") { dirs = [[1,-1], [1,1], [-1,-1], [-1,1]]; max = apo ? 3 : 2; jump = true; } 
    else if (p.type === "騎士") {
        let knightMoves = [[1,-2], [-1,-2], [1,2], [-1,2], [2,-1], [-2,-1], [2,1], [-2,1]];
        let m = apo ? 2 : 1; 
        for (let [dx, dy] of knightMoves) {
            let tx = sx + dx * m, ty = sy + dy * m;
            if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) cells.push([tx, ty]);
        }
        return cells;
    }
    
    for (let [dx, dy] of dirs) {
        for (let s = 1; s <= max; s++) {
            let tx = sx + dx * s, ty = sy + dy * s; if (!inBounds(tx, ty)) break; let t = board[ty][tx];
            if (jump) { if (t !== -1 && (t === 0 || t.color !== p.color)) cells.push([tx, ty]); continue; }
            if (t === 0) { cells.push([tx, ty]); } 
            else { if (t !== -1 && t.color !== p.color) cells.push([tx, ty]); break; }
        }
    }
    return cells;
}
// ==========================================
// 【追加】ルール説明画面（モーダル）の開閉制御
// ==========================================
function openHelp() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.style.display = 'flex'; // 非表示(none)から表示(flex)に切り替え
        logMessage("【システム】ルール説明書を開きました。");
    }
}

function closeHelp() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.style.display = 'none'; // 再び非表示(none)にする
    }
}
