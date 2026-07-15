// ==========================================
// 【後編：game_part3.js（前半）】各駒の移動・射程計算
// ==========================================

function getMovableCells(sx, sy) {
    let p = board[sy][sx]; if (!p) return [];
    let cells = [], dirs = [], max = 1, jump = false, apo = gameState.isApocalypseMode;
    
    // 1. 使徒（信徒）系の進化段階に応じた移動・捕獲ロジック
    if (p.type === "信徒") {
        let f = p.color === 'white' ? -1 : 1;
        
        // 【信徒（0）】または【狂信者（1）】
        if (p.evolutionLevel <= 1) {
            if (inBounds(sx, sy + f) && board[sy + f][sx] === 0) { 
                cells.push([sx, sy + f]); 
                if (!p.hasMoved && inBounds(sx, sy + f * 2) && board[sy + f * 2][sx] === 0) cells.push([sx, sy + f * 2]); 
            }
            for (let x of [sx - 1, sx + 1]) {
                if (inBounds(x, sy + f) && board[sy + f][x] && board[sy + f][x] !== -1 && board[sy + f][x].color !== p.color) cells.push([x, sy + f]);
            }
            if (p.evolutionLevel === 1 && inBounds(sx, sy + f) && board[sy + f][sx] && board[sy + f][sx] !== -1 && board[sy + f][sx].color !== p.color) cells.push([sx, sy + f]);
        } 
        // 【凶獣（2）】
        else if (p.evolutionLevel === 2) {
            if (inBounds(sx, sy + f) && board[sy + f][sx] === 0) {
                cells.push([sx, sy + f]); if (!p.hasMoved && inBounds(sx, sy + f * 2) && board[sy + f * 2][sx] === 0) cells.push([sx, sy + f * 2]);
            }
            for (let dx of [-1, 0, 1]) {
                if (inBounds(sx + dx, sy + f) && board[sy + f][sx + dx] && board[sy + f][sx + dx] !== -1 && board[sy + f][sx + dx].color !== p.color) cells.push([sx + dx, sy + f]);
            }
            for (let [dx, dy] of [[-1, 0], [1, 0], [0, -f]]) {
                let tx = sx + dx, ty = sy + dy;
                if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) cells.push([tx, ty]);
            }
        } 
        // 【終末の獣（3）】
        else if (p.evolutionLevel === 3) {
            for (let [dx, dy] of [[0, f], [-1, 0], [1, 0], [0, -f]]) {
                let tx = sx + dx, ty = sy + dy;
                if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) cells.push([tx, ty]);
            }
            for (let dx of [-1, 1]) {
                if (inBounds(sx + dx, sy + f) && board[sy + f][sx + dx] && board[sy + f][sx + dx] !== -1 && board[sy + f][sx + dx].color !== p.color) cells.push([sx + dx, sy + f]);
            }
            for (let [dx, dy] of [[0, f * 2], [0, -f * 2], [-2, 0], [2, 0]]) {
                let tx = sx + dx, ty = sy + dy;
                if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) cells.push([tx, ty]);
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
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dy === 0) continue; 
                let tx = sx + dx, ty = sy + dy;
                if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) cells.push([tx, ty]);
            }
        }
        for (let [dx, dy] of [[0,-1], [0,1], [-1,0], [1,0]]) {
            let tx = sx + dx, ty = sy + dy;
            if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) cells.push([tx, ty]);
        }
        return cells;
    } else if (p.type === "星喰い") { 
        let r = apo ? 6 : 4;
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0) continue; 
                let tx = sx + dx, ty = sy + dy;
                if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) cells.push([tx, ty]);
            }
        }
        for (let [dx, dy] of [[0,-1], [0,1], [-1,0], [1,0]]) {
            let tx = sx + dx, ty = sy + dy;
            if (inBounds(tx, ty) && board[ty][tx] !== -1 && (board[ty][tx] === 0 || board[ty][tx].color !== p.color)) cells.push([tx, ty]);
        }
        return cells;
    } else if (p.type === "死神") { dirs = [[1,-1], [1,1], [-1,-1], [-1,1]]; max = apo ? 3 : 2; jump = true; } 
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
