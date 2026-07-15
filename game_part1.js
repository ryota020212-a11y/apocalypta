// ==========================================
// 【前編：game_part1.js】データ定義と初期配置
// ==========================================
const BOARD_SIZE = 17;
let board = [];
let selectedCell = null;
let movableCells = [];
let peer = null;
let conn = null;
let myColor = 'white';

// ゲームの状態管理
let gameState = {
    currentTurn: 1,
    turnOwner: 'white',
    minLimit: 0,
    maxLimit: 16,
    deadEliteBelievers: { white: 0, black: 0 },
    playerScores: { white: 0, black: 0 },
    isApocalypseMode: false,
    apocalypseTimer: 0,
    gameActive: true,
    apocalypseTriggeredTurn: 0
};

// 各駒を倒した時の基本点数
const PIECE_SCORES = {
    "魔王": 0, "天使": 3, "堕天使": 3,
    "龍王": 4, "星喰い": 4, "死神": 3,
    "審問官": 2, "騎士": 2, "信徒": 1
};

// 通信処理（1台操作時も裏で初期化）
function initNetwork() {
    peer = new Peer();
    peer.on('open', (id) => {
        document.getElementById('my-id').innerText = id;
    });
    peer.on('connection', (c) => {
        conn = c;
        myColor = 'white';
        document.getElementById('my-role').innerText = "白（あなた）";
        setupEvents();
    });
}

function connectToPeer() {
    let id = document.getElementById('peer-id-input').value.trim();
    if (!id) return;
    conn = peer.connect(id);
    myColor = 'black';
    document.getElementById('my-role').innerText = "黒（あなた）";
    setupEvents();
}

function setupEvents() {
    conn.on('open', () => {
        logMessage("【通信】接続完了！");
        initBoardData();
        renderBoard();
    });
    conn.on('data', (d) => {
        if (d.type === 'MOVE') {
            board = d.board;
            gameState = d.gameState;
            selectedCell = null;
            movableCells = [];
            renderBoard();
        }
    });
}

function sendMove() {
    if (conn && conn.open) {
        conn.send({ type: 'MOVE', board: board, gameState: gameState });
    }
}

// 盤面データへの駒オブジェクトの正しい配置
function initBoardData() {
    board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    
    let layout = [
        "騎士", "審問官", "死神", "星喰い", "龍王", "堕天使", "天使", "天使", "魔王",
        "天使", "天使", "堕天使", "龍王", "星喰い", "死神", "審問官", "騎士"
    ];
    
    for(let x = 0; x < BOARD_SIZE; x++) {
        // 0行目に黒、16行目に白の主力駒をオブジェクトで正しく配置
        board[0][x] = { type: layout[x], color: 'black', evolutionLevel: 0, hasMoved: false };
        board[16][x] = { type: layout[x], color: 'white', evolutionLevel: 0, hasMoved: false };
        
        // 1行目に黒の使徒、15行目に白の使徒を配置
        if(x > 0 && x < 16) {
            board[1][x] = { type: "信徒", color: 'black', evolutionLevel: 0, hasMoved: false };
            board[15][x] = { type: "信徒", color: 'white', evolutionLevel: 0, hasMoved: false };
        }
    }
}
