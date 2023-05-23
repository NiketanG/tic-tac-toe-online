import { useEffect, useRef, useState } from "preact/hooks";
import { FunctionalComponent, JSX } from "preact";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/constants";
import { searchGame } from "../../utils/searchGame";
import socket from "../../utils/socket";
import "./game.css";
import { showToast } from "../../utils/showToast";

type SquareProps = {
	onClick: JSX.MouseEventHandler<HTMLButtonElement> | undefined;
	value: string | null;
};

const Square: FunctionalComponent<SquareProps> = ({ onClick, value }) => (
	<button className="square" onClick={onClick}>
		{value}
	</button>
);

type BoardProps = {
	mode: "CREATE" | "JOIN";
	gameId: number;
	data: {
		playingAs: string;
		squares: Array<string | null>;
		xIsNext: boolean;
		handleClick: (i: number) => void;
		enableRestart: boolean;
		restartGame: () => void;
	};
};

type FetchGameResponse = {
	result: "fail" | "success";
	board: Array<string | null>;
	next: "X" | "O";
};

type UpdateBoardResponse = {
	position: number;
	next: "X" | "O";
	player: any;
};
const Board: FunctionalComponent<BoardProps> = ({
	mode,
	data: {
		enableRestart,
		handleClick,
		restartGame,
		squares,
		xIsNext,
		playingAs,
	},
}) => {
	const [gameStatus, setGameStatus] = useState<string | null>(null);

	useEffect(() => {
		const gameResult = calculateWinner(squares);
		if (gameResult) {
			if (gameResult.winner && !gameResult.gameTied) {
				setGameStatus(`Winner : ${gameResult.winner}`);
			}
			if (gameResult.gameTied && !gameResult.winner) {
				setGameStatus("Game Tied");
			}
		} else {
			setGameStatus(
				`Next Player : ${
					xIsNext
						? mode === "CREATE"
							? "You"
							: "X"
						: mode === "JOIN"
						? "You"
						: "O"
				}`
			);
		}
	}, [squares]);

	const renderSquare = (i: number) => (
		<Square value={squares[i]} onClick={() => handleClick(i)} />
	);

	return (
		<div className="flex flex-col space-y-4 items-center">
			<p className="text-gray-500 text-sm md:text-base">{gameStatus}</p>

			<div>
				<div className="board-row">
					{renderSquare(0)}
					{renderSquare(1)}
					{renderSquare(2)}
				</div>
				<div className="board-row">
					{renderSquare(3)}
					{renderSquare(4)}
					{renderSquare(5)}
				</div>
				<div className="board-row">
					{renderSquare(6)}
					{renderSquare(7)}
					{renderSquare(8)}
				</div>
			</div>
			<p>
				Playing as : <b>{playingAs}</b>
			</p>
			{enableRestart && (
				<button
					className="mt-8 mb-4 px-4 py-3 bg-white border border-black rounded hover:text-white hover:bg-black transition"
					onClick={restartGame}
				>
					Restart
				</button>
			)}
		</div>
	);
};

function calculateWinner(boardData: Array<string | null>) {
	const lines = [
		[0, 1, 2],
		[3, 4, 5],
		[6, 7, 8],
		[0, 3, 6],
		[1, 4, 7],
		[2, 5, 8],
		[0, 4, 8],
		[2, 4, 6],
	];
	for (let i = 0; i < lines.length; i++) {
		const [a, b, c] = lines[i];
		if (
			boardData[a] &&
			boardData[a] === boardData[b] &&
			boardData[a] === boardData[c]
		) {
			return {
				winner: boardData[a],
				gameTied: false,
			};
		}
	}
	if (boardData.includes(null) === false) {
		return {
			winner: null,
			gameTied: true,
		};
	}
	return null;
}

type LocationStateType = {
	gameId: number;
	mode: "CREATE" | "JOIN";
};

type SocketConnectedData = {
	game_id: string;
	online: string[];
};

const Game: FunctionalComponent<any> = () => {
	const [online, setOnline] = useState(0);

	const location = useLocation();
	const navigate = useNavigate();

	const [squares, setSquares] = useState<Array<string | null>>([]);
	const [xIsNext, setXIsNext] = useState(true);
	const [enableRestart, setEnableRestart] = useState(false);

	const squaresRef = useRef(squares);

	useEffect(() => {
		squaresRef.current = squares;
	});

	const gameId = (location.state as LocationStateType)?.gameId;
	const mode = (location.state as LocationStateType)?.mode || "JOIN";

	const playingAs = mode === "CREATE" ? "X" : "O";

	// Socket related
	const [connectedData, setConnectedData] =
		useState<SocketConnectedData | null>(null);

	const prevConnectedRef = useRef<SocketConnectedData | null>();
	useEffect(() => {
		//assign the ref's current value to the count Hook
		prevConnectedRef.current = connectedData;
	}, [connectedData]);

	const connected = (data: SocketConnectedData) => {
		// setConnected(data);
		const currentPlayer = mode === "CREATE" ? "X" : "O";
		// Notify when opponent joins

		if (
			prevConnectedRef?.current?.online.length === 1 &&
			data.online.length === 2 &&
			prevConnectedRef?.current?.online.includes(currentPlayer)
		) {
			showToast("🆕  Opponent joined");
		}

		if (
			prevConnectedRef?.current?.online.length === 2 &&
			data.online.length === 1
		) {
			showToast("❌  Opponent left");
		}
		setConnectedData(data);
		setOnline(data.online.length);
	};

	const checkIfGameExists = async () => {
		const gameExists = await searchGame(gameId.toString());
		console.log("gameExists", gameExists);
		if (!gameExists) {
			navigate(
				{
					pathname: "/",
				},
				{
					replace: true,
				}
			);
		}
	};

	useEffect(() => {
		if ((gameId as any) !== "COMPUTER") {
			getBoard();
			socket.on("moved", updateBoard);
			socket.on("restarted", () => {
				getBoard();
				showToast("Game Restarted !");
			});
			return () => {
				socket.off("moved", updateBoard);
			};
		} else {
			setOnline(1);
			setSquares(Array(9).fill(null));
		}
	}, []);

	const updateBoard = (data: UpdateBoardResponse) => {
		const updatedSquares = [...squaresRef.current];
		updatedSquares[data.position] = data.player;
		setSquares(updatedSquares);
		setXIsNext(data.next === "X");
		const gameResult = calculateWinner(updatedSquares);
		if (gameResult) setEnableRestart(true);
		if (gameResult?.gameTied) {
			showToast("Game Tied");
		}

		if (gameResult?.winner) {
			if (gameResult.winner === playingAs) {
				showToast("You won 🎉️");
			} else {
				showToast("You lost");
			}
		}
	};

	const getBoard = async () => {
		setEnableRestart(false);
		const res = await fetch(`${API_URL}api/fetch/game/${gameId}`);
		const data: FetchGameResponse = await res.json();
		if (data.result === "success") {
			setSquares(data.board);
			setXIsNext(data.next === "X");
			const status = calculateWinner(data.board);
			if (status) setEnableRestart(true);
		} else if (data.result === "fail") {
			console.log("result", data.result);
			navigate({ pathname: "/" }, { replace: true });
		}
	};

	const enqueueComputerMove = async (newBoard: (string | null)[]) => {
		// Computer move
		// Get empty squares
		const emptySquares = newBoard
			.map((square, index) => {
				if (square === null) return index;
				return null;
			})
			.filter((square) => square !== null);

		// Make a random move from empty squares
		const randomIndex = Math.floor(Math.random() * emptySquares.length);
		const randomSquare = emptySquares[randomIndex];

		if (randomSquare !== null) {
			updateBoard({
				next: "X",
				player: "O",
				position: randomSquare,
			});
		}
	};

	const checkWinner = (newBoard: (string | null)[]) => {
		const gameResult = calculateWinner(newBoard);

		if (gameResult) {
			if (gameResult?.gameTied) {
				showToast("Game Tied");
			} else if (gameResult?.winner) {
				if (gameResult.winner === playingAs) {
					showToast("You won 🎉️");
				} else {
					showToast("You lost");
				}
			}
			setEnableRestart(true);
			return gameResult;
		}
		return false;
	};

	const handleClick = (i: number) => {
		const tempSquares = squares.slice();
		// Check if square is already filled
		if (tempSquares[i] || enableRestart) return;

		if (mode === "CREATE" && xIsNext) {
			tempSquares[i] = "X";
			setSquares(tempSquares);
			setXIsNext(false);
			if ((gameId as any) !== "COMPUTER") {
				socket.emit("move", {
					player: tempSquares[i],
					position: i,
					game_id: gameId,
				});
			} else {
				const isWinner = checkWinner(tempSquares);
				if (isWinner) return;
				setTimeout(() => {
					enqueueComputerMove(tempSquares);
				}, 1000);
			}
		} else if (mode === "JOIN" && !xIsNext) {
			tempSquares[i] = "O";
			setSquares(tempSquares);
			setXIsNext(true);
			if ((gameId as any) !== "COMPUTER") {
				socket.emit("move", {
					player: tempSquares[i],
					position: i,
					game_id: gameId,
				});
			}
		}
	};

	const restartGame = () => {
		if (gameId && (gameId as any) !== "COMPUTER") {
			socket.emit("restartGame", { game_id: gameId });
		} else {
			setSquares(Array(9).fill(null));
			setXIsNext(true);
			showToast("Game Restarted !");
			setEnableRestart(false);
		}
	};

	useEffect(() => {
		if (gameId && (gameId as any) !== "COMPUTER") checkIfGameExists();
	}, [gameId]);

	useEffect(() => {
		if ((gameId as any) !== "COMPUTER") {
			if (location.state !== undefined && gameId)
				socket.emit("join", {
					game_id: gameId,
					player: mode === "CREATE" ? "X" : "O",
				});

			socket.on("connected", connected);
			socket.on("disconnected", connected);
			return () => {
				socket.emit("leave", {
					game_id: gameId,
					player: mode === "CREATE" ? "X" : "O",
				});
				socket.off("connected");
			};
		}
	}, []);

	if (!location.state || !gameId) {
		console.log({
			state: location.state,
			gameId: gameId,
		});
		navigate(
			{
				pathname: "/",
			},
			{
				replace: true,
			}
		);
	}

	return (
		<div
			className="flex flex-col items-center px-4"
			style={{
				height: window.innerHeight,
			}}
		>
			<Link to="/" className="underline text-gray-500">
				Go Home
			</Link>

			{(gameId as any) !== "COMPUTER" ? (
				<p className="self-end md:text-lg">Joined: {online}</p>
			) : null}
			<div className="flex-grow-1 h-full justify-center flex flex-col">
				<Board
					gameId={gameId}
					mode={mode}
					data={{
						squares,
						xIsNext,
						handleClick,
						enableRestart,
						restartGame,
						playingAs,
					}}
				/>
			</div>

			<a
				target="_blank"
				href={window.location.origin + "/join/" + gameId}
				className="my-4 text-gray-500 text-sm md:text-base"
				rel="noreferrer"
			>
				Game: {gameId}
			</a>
		</div>
	);
};

export default Game;
