import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import { API_URL } from "../../utils/constants";
import { searchGame } from "../../utils/searchGame";
import socket from "../../utils/socket";
import "./game.css";
import { toast, Slide } from "react-toastify";

type SquareProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
	value: string | null;
};

const Square: React.FC<SquareProps> = ({ onClick, value }) => (
	<button className="square" onClick={onClick}>
		{value}
	</button>
);

type BoardProps = {
	mode: "CREATE" | "JOIN";
	gameId: number;
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
const Board: React.FC<BoardProps> = ({ mode, gameId }) => {
	const [squares, setSquares] = useState<Array<string | null>>([]);
	const [xIsNext, setXIsNext] = useState(true);
	const [gameStatus, setGameStatus] = useState<string | null>(null);
	const [enableRestart, setEnableRestart] = useState(false);

	const playingAs = mode === "CREATE" ? "X" : "O";

	const history = useHistory();

	const squaresRef = useRef(squares);

	useEffect(() => {
		squaresRef.current = squares;
	});

	const showToast = (text: string) =>
		toast(text, {
			position: "bottom-center",
			hideProgressBar: true,
			draggable: false,
			autoClose: 5000,
			pauseOnHover: false,
			closeOnClick: true,
			transition: Slide,
		});
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

	useEffect(() => {
		getBoard();
		socket.on("moved", updateBoard);
		socket.on("restarted", () => {
			getBoard();
			showToast("Game Restarted !");
		});
		return () => {
			socket.off("moved", updateBoard);
		};
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
			history.replace({ pathname: "/" });
		}
	};

	const handleClick = (i: number) => {
		const tempSquares = squares.slice();
		const gameResult = calculateWinner(squares);

		if (gameResult || squares[i]) {
			if (gameResult?.gameTied) {
				showToast("Game Tied");
			} else if (gameResult?.winner) {
				if (gameResult.winner === playingAs) {
					showToast("You won 🎉️");
				} else {
					showToast("You lost");
				}
			}
			return;
		}

		if (mode === "CREATE" && xIsNext) {
			tempSquares[i] = "X";
			setSquares(tempSquares);
			setXIsNext(false);
			socket.emit("move", {
				player: tempSquares[i],
				position: i,
				game_id: gameId,
			});
		} else if (mode === "JOIN" && !xIsNext) {
			tempSquares[i] = "O";
			setSquares(tempSquares);
			setXIsNext(true);
			socket.emit("move", {
				player: tempSquares[i],
				position: i,
				game_id: gameId,
			});
		}
	};

	const renderSquare = (i: number) => (
		<Square value={squares[i]} onClick={() => handleClick(i)} />
	);

	const restartGame = () => socket.emit("restartGame", { game_id: gameId });

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
			{enableRestart && <button onClick={restartGame}>Restart</button>}
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

const Game: React.FC<any> = () => {
	const [online, setOnline] = useState(0);

	const location = useLocation();
	const history = useHistory();

	const connected = (data: SocketConnectedData) =>
		setOnline(data.online.length);

	const gameId = (location.state as LocationStateType)?.gameId;
	const mode = (location.state as LocationStateType)?.mode || "JOIN";

	const checkIfGameExists = async () => {
		const gameExists = await searchGame(gameId.toString());
		if (!gameExists) {
			history.replace({
				pathname: "/",
			});
		}
	};

	useEffect(() => {
		if (location.state !== undefined && gameId) checkIfGameExists();
	}, []);

	useEffect(() => {
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
	}, []);

	if (!location.state || !gameId)
		history.replace({
			pathname: "/",
		});

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

			<p className="self-end md:text-lg">Joined: {online}</p>

			<div className="flex-grow-1 h-full justify-center flex flex-col">
				<Board gameId={gameId} mode={mode} />
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
