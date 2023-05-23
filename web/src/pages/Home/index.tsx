import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { useNavigate } from "react-router-dom";
import { Slide, toast } from "react-toastify";

import { API_URL } from "../../utils/constants";
import { errorToast } from "../../utils/errorToast";
import { searchGame } from "../../utils/searchGame";

const Home: FunctionalComponent<any> = () => {
	const [gameId, setGameId] = useState(null);
	const [gameExists, setGameExists] = useState(true);
	const [gameIdToJoin, setGameIdToJoin] = useState<string | null>(null);
	const [bothJoined, setBothJoined] = useState(false);
	const [joinGameInput, setJoinGameInput] = useState(false);
	const [creatingGame, setCreatingGame] = useState(false);

	const [joiningGame, setJoiningGame] = useState(false);

	const navigate = useNavigate();

	const createGame = async () => {
		setJoinGameInput(false);
		setCreatingGame(true);
		try {
			const res = await fetch(`${API_URL}api/create/game`);
			const data = await res.json();
			if (data.result === "success") {
				setGameId(data.game_id);
				setCreatingGame(false);
			}
		} catch (err) {
			console.error(err);
			setCreatingGame(false);
			errorToast();
		}
	};

	const toggleJoinGameInput = () => setJoinGameInput(!joinGameInput);

	const playAgainstComputer = () => {
		navigate(`/game?gameId=COMPUTER&mode=CREATE`, {
			state: {
				gameId: "COMPUTER",
				mode: "CREATE",
			},
		});
	};

	const startGame = () =>
		navigate(
			{
				pathname: "/game",
			},
			{
				state: {
					gameId,
					mode: "CREATE",
				},
			}
		);

	const joinGame = async () => {
		if (!gameIdToJoin) return null;
		try {
			setJoiningGame(true);

			const gameExists = await searchGame(gameIdToJoin);

			if (gameExists) {
				setGameExists(true);
				setJoiningGame(false);
				if (gameExists.online !== 2) {
					navigate(
						{
							pathname: "/game",
						},
						{
							state: {
								gameId: gameIdToJoin,
								mode: "JOIN",
							},
						}
					);
				} else {
					setBothJoined(true);
				}
			} else {
				setBothJoined(false);
				setGameExists(false);
				setJoiningGame(false);
			}
		} catch (err) {
			console.error(err);
			errorToast();
			setJoiningGame(false);
		}
	};

	const copyLink = (link: string) => {
		navigator.clipboard?.writeText(link);
		toast("Copied", {
			position: "bottom-center",
			hideProgressBar: true,
			draggable: false,
			autoClose: 5000,
			pauseOnHover: false,
			closeOnClick: true,
			transition: Slide,
			bodyClassName: "flex items-center flex-row  text-black rounded-lg",
		});
	};

	const shareLink = (link: string) => {
		if (navigator.share) {
			try {
				navigator.share({
					title: "Tic Tac Toe Online",
					text: "You're invited to play Tic Tac Toe Online",
					url: link,
				});
			} catch (err) {
				console.error(err);
			}
		} else {
			console.error("Sharing not supported");
		}
	};

	return (
		<div
			className="flex flex-col w-screen  items-center justify-center px-4"
			style={{
				height: window.innerHeight,
			}}
		>
			<div className="flex flex-col space-y-4 h-full items-center justify-center">
				<span className="flex">
					<p className="text-4xl font-bold mt-2">Tic-Tac-Toe</p>
					<p className="font-light text-xl ">Online</p>
				</span>
				<h3 className="text-xl text-center pt-4">Get Started</h3>
				<div className="flex justify-center flex-wrap">
					<div className="px-0 py-2 md:px-3 md:py-0">
						<button
							className="bg-black text-white px-4 py-3 hover:bg-white hover:text-black border border-black transition"
							onClick={createGame}
						>
							{creatingGame ? "Creating..." : "Create a new game"}
						</button>
					</div>
					<div className="px-0 py-2 md:px-3 md:py-0">
						<button
							onClick={toggleJoinGameInput}
							className="border border-black bg-transparent text-black hover:bg-black hover:text-white px-4 py-3 transition"
						>
							{joiningGame ? "Joining..." : "Join a game"}
						</button>
					</div>
				</div>
				<div className="px-0 py-2 md:px-3 md:py-0">
					<p className={"text-center mb-2"}>Or</p>
					<button
						className="border border-black bg-transparent text-black hover:bg-black hover:text-white px-4 py-3 transition"
						onClick={playAgainstComputer}
					>
						Play against Computer
					</button>
				</div>
				{gameId && (
					<div className="flex items-center flex-col text-center py-4 px-4">
						<h4 className="text-lg font-semibold">
							Game Created.
							<br />
							Game ID : {gameId}
						</h4>
						<p className="text-sm md:text-base">
							Ask the other player to enter this ID while Joining
							the game. Or use the link below (Tap to copy) :
						</p>
						<button
							onClick={() =>
								copyLink(window.location + "join/" + gameId)
							}
							className="my-4 text-gray-700"
						>
							{window.location + "join/" + gameId}
						</button>
						{navigator.share !== undefined && (
							<button
								className="text-lg font-medium "
								onClick={() =>
									shareLink(
										window.location + "join/" + gameId
									)
								}
							>
								Share
							</button>
						)}
						<button
							className="bg-black text-white transition hover:bg-white hover:text-black  w-full md:w-64 py-3 my-4 border border-black"
							onClick={startGame}
						>
							Start Game
						</button>
					</div>
				)}
				{joinGameInput && (
					<div className="">
						<div className="flex flex-row space-x-4 justify-center">
							<input
								type="text"
								name="gameID"
								id="gameID"
								className="bg-gray-100 px-4 py-3 rounded-md w-48"
								placeholder="Game ID"
								onChange={(e) => {
									setGameIdToJoin((e.target as any)?.value);
								}}
							/>
							<button
								className="text-white bg-black py-3 px-6"
								onClick={joinGame}
							>
								Join
							</button>
						</div>
						<div>
							{bothJoined && (
								<h3 className="my-4 text-red-700">
									Both players have already joined.
								</h3>
							)}

							{!gameExists && (
								<h3 className="my-4 text-red-700">
									Game doesn&apos;t exist. Create one to start
									playing.
								</h3>
							)}
						</div>
					</div>
				)}
			</div>
			<div className=" mb-4 text-center flex flex-col text-sm md:text-base">
				<a
					href="https://github.com/NiketanG/tic-tac-toe-online"
					target="_blank"
					rel="noreferrer"
					className="underline text-gray-600"
				>
					Learn More
				</a>
				<p>
					Designed and Developed by{" "}
					<a href="http://bit.ly/nikketan">Niketan Gulekar</a> &copy;
					{new Date().getFullYear()}
				</p>
			</div>
		</div>
	);
};

export default Home;
