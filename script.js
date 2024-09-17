// Reference to the chessboard container
const chessboard = document.getElementById('chessboard');

// Unicode characters for chess pieces
const pieces = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

// Initial board setup
const initialBoard = [
    ['black.rook', 'black.knight', 'black.bishop', 'black.queen', 'black.king', 'black.bishop', 'black.knight', 'black.rook'],
    ['black.pawn', 'black.pawn', 'black.pawn', 'black.pawn', 'black.pawn', 'black.pawn', 'black.pawn', 'black.pawn'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['white.pawn', 'white.pawn', 'white.pawn', 'white.pawn', 'white.pawn', 'white.pawn', 'white.pawn', 'white.pawn'],
    ['white.rook', 'white.knight', 'white.bishop', 'white.queen', 'white.king', 'white.bishop', 'white.knight', 'white.rook']
];

// Game state
let gameState = {
    board: JSON.parse(JSON.stringify(initialBoard)), // Deep copy
    selectedPiece: null,
    turn: 'white',
    capturedPieces: [],
    moveHistory: []
};

// Timers
let timers = {
    white: 300, // 5 minutes in seconds
    black: 300
};

let timerInterval = null;

// Function to render the chessboard
function renderChessboard() {
    chessboard.innerHTML = ''; // Clear the board

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            // Create a square
            const square = document.createElement('div');
            square.classList.add('square');

            // Assign light or dark class
            if ((row + col) % 2 === 0) {
                square.classList.add('light');
            } else {
                square.classList.add('dark');
            }

            // Set data attributes for row and column
            square.dataset.row = row;
            square.dataset.col = col;

            // Get the piece from the game state
            const pieceInfo = gameState.board[row][col];
            if (pieceInfo) {
                const [color, type] = pieceInfo.split('.');
                const piece = document.createElement('span');
                piece.classList.add('piece', color);
                piece.textContent = pieces[color][type];
                square.appendChild(piece);
            }

            // Add click event listener
            square.addEventListener('click', handleSquareClick);

            // Append the square to the chessboard
            chessboard.appendChild(square);
        }
    }
}

// Handle square click
function handleSquareClick(event) {
    const square = event.currentTarget;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const pieceInfo = gameState.board[row][col];

    if (gameState.selectedPiece) {
        // Attempt to move the selected piece to the clicked square
        movePiece(gameState.selectedPiece, { row, col });
        clearHighlights();
    } else if (pieceInfo && pieceInfo.startsWith(gameState.turn)) {
        // Select the piece and highlight possible moves
        gameState.selectedPiece = { row, col, piece: pieceInfo };
        highlightSelectedSquare(square);

        // Get possible moves
        const possibleMoves = getPossibleMoves(pieceInfo, { row, col });
        highlightPossibleMoves(possibleMoves);
    }
}

function movePiece(from, to) {
    const pieceInfo = gameState.board[from.row][from.col];
    const possibleMoves = getPossibleMoves(pieceInfo, from);

    // Check if the move is in possible moves
    const validMove = possibleMoves.some(
        move => move.row === to.row && move.col === to.col
    );

    if (!validMove) {
        console.log('Invalid move');
        gameState.selectedPiece = null;
        return;
    }

    // Move the piece
    executeMove(from, to);

    const enemyColor = gameState.turn === 'white' ? 'black' : 'white';

    // Check if the opposing king is in check
    if (isKingInCheck(enemyColor)) {
        console.log(`${enemyColor} king is in check!`);
        // Check for checkmate
        if (isCheckmate(enemyColor)) {
            showGameOver(`${gameState.turn} wins by checkmate!`);
            return;
        }
    } else {
        // Check for stalemate
        if (isStalemate(enemyColor)) {
            showGameOver('Stalemate! The game is a draw.');
            return;
        }
    }

    // Switch turns
    gameState.turn = enemyColor;

    // Start the timer for the next player
    startTimer();

    // Re-render the board
    renderChessboard();
}

function executeMove(from, to) {
    const pieceInfo = gameState.board[from.row][from.col];
    const targetPiece = gameState.board[to.row][to.col];

    // Handle capture
    if (targetPiece) {
        gameState.capturedPieces.push(targetPiece);
    }

    // Move the piece
    gameState.board[to.row][to.col] = pieceInfo;
    gameState.board[from.row][from.col] = null;

    // Check for pawn promotion
    const [color, type] = pieceInfo.split('.');
    if (type === 'pawn' && (to.row === 0 || to.row === 7)) {
        // Promote pawn to queen
        gameState.board[to.row][to.col] = `${color}.queen`;
    }

    // Reset selected piece
    gameState.selectedPiece = null;

    // Add move to history
    addMoveToHistory(pieceInfo, from, to);

    // Update captured pieces display
    renderCapturedPieces();
}

function highlightSelectedSquare(square) {
    // Remove existing highlights
    const squares = document.querySelectorAll('.square');
    squares.forEach(sq => sq.classList.remove('selected'));

    // Highlight the selected square
    square.classList.add('selected');
}

function highlightPossibleMoves(moves) {
    moves.forEach(move => {
        const square = document.querySelector(
            `.square[data-row='${move.row}'][data-col='${move.col}']`
        );
        if (square) {
            square.classList.add('highlight');
        }
    });
}

function clearHighlights() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(sq => sq.classList.remove('highlight', 'selected'));
}

function getPossibleMoves(pieceInfo, position, skipKingSafety = false) {
    const [color, type] = pieceInfo.split('.');
    let moves = [];
    const { row, col } = position;

    const isEnemy = (r, c) => {
        const target = gameState.board[r][c];
        return target && !target.startsWith(color);
    };

    const isEmpty = (r, c) => !gameState.board[r][c];

    const isInBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

    if (type === 'pawn') {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        // Move forward
        const forwardRow = row + direction;
        if (isInBounds(forwardRow, col) && isEmpty(forwardRow, col)) {
            moves.push({ row: forwardRow, col });

            // Double move from starting position
            const doubleForwardRow = row + 2 * direction;
            if (
                row === startRow &&
                isEmpty(doubleForwardRow, col) &&
                isEmpty(forwardRow, col) // Ensure the square in between is empty
            ) {
                moves.push({ row: doubleForwardRow, col });
            }
        }

        // Capture diagonally
        [col - 1, col + 1].forEach(newCol => {
            if (
                isInBounds(forwardRow, newCol) &&
                isEnemy(forwardRow, newCol)
            ) {
                moves.push({ row: forwardRow, col: newCol });
            }
        });

        // TODO: En Passant
    }

    if (type === 'knight') {
        const knightMoves = [
            { row: -2, col: -1 }, { row: -2, col: 1 },
            { row: -1, col: -2 }, { row: -1, col: 2 },
            { row: 1, col: -2 }, { row: 1, col: 2 },
            { row: 2, col: -1 }, { row: 2, col: 1 },
        ];

        knightMoves.forEach(move => {
            const newRow = row + move.row;
            const newCol = col + move.col;
            if (
                isInBounds(newRow, newCol) &&
                (!gameState.board[newRow][newCol] ||
                    isEnemy(newRow, newCol))
            ) {
                moves.push({ row: newRow, col: newCol });
            }
        });
    }

    if (type === 'rook') {
        const directions = [
            { row: -1, col: 0 }, // Up
            { row: 1, col: 0 },  // Down
            { row: 0, col: -1 }, // Left
            { row: 0, col: 1 },  // Right
        ];

        directions.forEach(dir => {
            let newRow = row + dir.row;
            let newCol = col + dir.col;
            while (isInBounds(newRow, newCol)) {
                if (isEmpty(newRow, newCol)) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (isEnemy(newRow, newCol)) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += dir.row;
                newCol += dir.col;
            }
        });
    }

    if (type === 'bishop') {
        const directions = [
            { row: -1, col: -1 }, // Up-Left
            { row: -1, col: 1 },  // Up-Right
            { row: 1, col: -1 },  // Down-Left
            { row: 1, col: 1 },   // Down-Right
        ];

        directions.forEach(dir => {
            let newRow = row + dir.row;
            let newCol = col + dir.col;
            while (isInBounds(newRow, newCol)) {
                if (isEmpty(newRow, newCol)) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (isEnemy(newRow, newCol)) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += dir.row;
                newCol += dir.col;
            }
        });
    }

    if (type === 'queen') {
        // Combine rook and bishop movements
        const directions = [
            // Rook-like movements
            { row: -1, col: 0 }, { row: 1, col: 0 },
            { row: 0, col: -1 }, { row: 0, col: 1 },
            // Bishop-like movements
            { row: -1, col: -1 }, { row: -1, col: 1 },
            { row: 1, col: -1 }, { row: 1, col: 1 },
        ];

        directions.forEach(dir => {
            let newRow = row + dir.row;
            let newCol = col + dir.col;
            while (isInBounds(newRow, newCol)) {
                if (isEmpty(newRow, newCol)) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (isEnemy(newRow, newCol)) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += dir.row;
                newCol += dir.col;
            }
        });
    }

    if (type === 'king') {
        const kingMoves = [
            { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
            { row: 0, col: -1 },                   { row: 0, col: 1 },
            { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 },
        ];

        kingMoves.forEach(move => {
            const newRow = row + move.row;
            const newCol = col + move.col;
            if (
                isInBounds(newRow, newCol) &&
                (!gameState.board[newRow][newCol] ||
                    isEnemy(newRow, newCol))
            ) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        // TODO: Castling
    }

    // After generating all possible moves for the piece, filter them
    // if skipKingSafety is false
    if (!skipKingSafety) {
        moves = moves.filter(move => {
            // Simulate the move
            const originalPiece = gameState.board[move.row][move.col];
            const fromPiece = gameState.board[position.row][position.col];

            gameState.board[move.row][move.col] = fromPiece;
            gameState.board[position.row][position.col] = null;

            const kingInCheck = isKingInCheck(color);

            // Undo the move
            gameState.board[position.row][position.col] = fromPiece;
            gameState.board[move.row][move.col] = originalPiece;

            return !kingInCheck;
        });
    }

    return moves;
}

function isKingInCheck(color) {
    // Find the king's position
    let kingPosition = null;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState.board[row][col] === `${color}.king`) {
                kingPosition = { row, col };
                break;
            }
        }
        if (kingPosition) break;
    }

    // Check if any enemy piece can attack the king
    const enemyColor = color === 'white' ? 'black' : 'white';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.startsWith(enemyColor)) {
                const moves = getPossibleMoves(piece, { row, col }, true);
                if (moves.some(move => move.row === kingPosition.row && move.col === kingPosition.col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isCheckmate(color) {
    // Loop through all pieces of the given color
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.startsWith(color)) {
                const moves = getPossibleMoves(piece, { row, col });
                if (moves.length > 0) {
                    return false; // Not checkmate
                }
            }
        }
    }
    return true; // Checkmate
}

function isStalemate(color) {
    if (isKingInCheck(color)) return false;

    // Loop through all pieces of the given color
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.startsWith(color)) {
                const moves = getPossibleMoves(piece, { row, col });
                if (moves.length > 0) {
                    return false; // Not stalemate
                }
            }
        }
    }
    return true; // Stalemate
}

// Game over functions
function showGameOver(message) {
    const gameOverModal = document.getElementById('game-over');
    const gameOverMessage = document.getElementById('game-over-message');
    gameOverMessage.textContent = message;
    gameOverModal.classList.remove('hidden');
    gameOverModal.classList.add('modal'); // Add the modal class

    // Disable clicking on the chessboard
    chessboard.style.pointerEvents = 'none';

    // Stop the timer
    if (timerInterval) clearInterval(timerInterval);
}

// Restart the game
document.getElementById('restart-button').addEventListener('click', () => {
    // Reset the game state
    gameState.board = JSON.parse(JSON.stringify(initialBoard));
    gameState.turn = 'white';
    gameState.selectedPiece = null;
    gameState.capturedPieces = [];
    gameState.moveHistory = [];

    // Hide the game over modal
    const gameOverModal = document.getElementById('game-over');
    gameOverModal.classList.add('hidden');
    gameOverModal.classList.remove('modal'); // Remove the modal class

    // Enable clicking on the chessboard
    chessboard.style.pointerEvents = 'auto';

    // Reset timers
    timers.white = 300;
    timers.black = 300;
    updateTimerDisplay();
    startTimer();

    // Re-render the board and UI components
    renderChessboard();
    renderMoveHistory();
    renderCapturedPieces();
});

// Move history functions
function addMoveToHistory(pieceInfo, from, to) {
    const [color, type] = pieceInfo.split('.');
    const move = {
        color,
        piece: type,
        from,
        to,
    };
    gameState.moveHistory.push(move);
    renderMoveHistory();
}

function renderMoveHistory() {
    const moveHistoryList = document.getElementById('move-history');
    moveHistoryList.innerHTML = '';

    gameState.moveHistory.forEach((move, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${move.color} ${move.piece} ${String.fromCharCode(97 + move.from.col)}${8 - move.from.row} → ${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
        moveHistoryList.appendChild(listItem);
    });
}

// Captured pieces functions
function renderCapturedPieces() {
    const whiteCapturesDiv = document.getElementById('white-captures');
    const blackCapturesDiv = document.getElementById('black-captures');
    whiteCapturesDiv.innerHTML = '';
    blackCapturesDiv.innerHTML = '';

    gameState.capturedPieces.forEach(pieceInfo => {
        const [color, type] = pieceInfo.split('.');
        const piece = document.createElement('span');
        piece.classList.add('piece', color);
        piece.textContent = pieces[color][type];

        if (color === 'white') {
            blackCapturesDiv.appendChild(piece);
        } else {
            whiteCapturesDiv.appendChild(piece);
        }
    });
}

// Timer functions
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timers[gameState.turn]--;

        if (timers[gameState.turn] <= 0) {
            clearInterval(timerInterval);
            showGameOver(`${gameState.turn === 'white' ? 'Black' : 'White'} wins by timeout!`);
        }

        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const whiteTimeSpan = document.getElementById('white-time');
    const blackTimeSpan = document.getElementById('black-time');

    whiteTimeSpan.textContent = formatTime(timers.white);
    blackTimeSpan.textContent = formatTime(timers.black);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Start the timer when the game loads
window.onload = function() {
    startTimer();
    renderChessboard();
    updateTimerDisplay();
};
