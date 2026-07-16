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
    apocalypseTriggeredTurn: 0,
    capturedPieces: { white: [], black: [] }
};


// 各駒を倒した時の基本点数
const PIECE_SCORES = {
    "魔王": 0, "天使": 3, "堕天使": 3,
    "龍王": 4, "星喰い": 4, "死神": 3,
    "審問官": 2, "騎士": 2, "信徒": 1
};

// ==========================================
// 【完全修正】ブラウザ内部直通・100%確実に動くローカル同期システム
// ==========================================
let gameChannel = null;

function initNetwork() {
    logMessage("【システム】部屋名を入力して「白でプレイ」または「黒でプレイ」を押すとマルチ対戦になります。");
}

// 指定した部屋名（チャンネル）に入室する処理
function connectToRoom(chosenColor) {
    let roomId = document.getElementById('room-id-input').value.trim();
    if (!roomId) {
        alert("部屋名を入力してください（例: room123）");
        return;
    }

    myColor = chosenColor;
    document.getElementById('my-role').innerText = `${myColor === 'white' ? '白' : '黒'}（あなた）`;

    // 💡 既存の通信があれば一度閉じる
    if (gameChannel) gameChannel.close();

    // 💡 ブラウザの内部機能で「部屋名」と同じ直通通信チューブを作成
    gameChannel = new BroadcastChannel(`apocalypse_room_${roomId}`);

    // 相手プレイヤーから盤面データが飛んできたときの処理
    gameChannel.onmessage = function(e) {
        let d = e.data;
        
        // 自分が送信したデータなら無視（無限ループ防止）
        if (d.sender === myColor) return;

        if (d.type === 'MOVE') {
            board = d.board;
            gameState = d.gameState;
            selectedCell = null;
            movableCells = [];
            renderBoard();
            logMessage(`【同期】相手が駒を指しました。「${gameState.turnOwner === 'white' ? '白' : '黒'}」の番です。`);
        }
    };

    logMessage(`【通信成功】部屋「${roomId}」に入室しました！`);

    // 白（先手）プレイヤーが入室した場合は、現在の初期配置を黒側に一発同期させる
    if (myColor === 'white') {
        initBoardData();
        renderBoard();
        sendMove();
    }
}

// 駒を動かしたときに、ブラウザの通信チューブを通して相手に送る関数
function sendMove() {
    if (gameChannel) {
        gameChannel.postMessage({
            type: 'MOVE',
            sender: myColor, // 誰が指した手か
            board: board,
            gameState: gameState
        });
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
