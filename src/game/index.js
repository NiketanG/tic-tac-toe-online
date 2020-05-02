import React from 'react';
import './Game.css';
import io from 'socket.io-client';
import {Redirect, Link} from 'react-router-dom';
import toaster from 'toasted-notes';
import 'toasted-notes/src/styles.css';

let url = window.location.protocol + '//' + document.domain;
if (window.location.port !== "") {
	url += ':' + window.location.port;
}
url+='/Game'
let socket = io.connect(url);
function Square(props) {
	return (
		<button
			className="square"
			onClick={props.onClick}
		>
			{props.value}
		</button>
	);
}

class Board extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			squares: [],
			xIsNext: true,
			enableRestart: false
		};
		this.getBoard = this.getBoard.bind(this);
	}

	componentDidMount(){
		this.getBoard();
		socket.on('moved', (data)=>this.updateBoard(data))
		socket.on('restarted', ()=> {
				this.getBoard();
				toaster.notify('Game Restarted !', {
					duration: 2000
			  	})
		}
			)
	}

	updateBoard(data){
		let pos = data.position
		let updatedSquares = this.state.squares;
		updatedSquares[pos] = data.player;
		this.setState({squares: updatedSquares,
			xIsNext: data.next === 'X' ? true : false})
		const squares = updatedSquares;
		let status = calculateWinner(squares);
		if (status) {
				this.setState({enableRestart: true})
		}
		// this.setState({squares: data.board,
		// 	xIsNext: data.next === 'X' ? true : false})
	}

	getBoard(){
		this.setState({enableRestart: false})
		fetch('/api/fetch/game/' + this.props.game_id )
			.then((response) => response.json())
			.then((data) => {
				if (data.result === 'success') {
					this.setState({squares: data.board,
						xIsNext: data.next === 'X' ? true : false})
					const squares = data.board;
					let status = calculateWinner(squares);
					if (status) {
							this.setState({enableRestart: true})
					}

				} else if (data.result === 'fail') {
					window.location.href='/'
				}
			});
		
	}

	restartGame(){
		socket.emit('restartGame', {"game_id": this.props.game_id});
		
	}

	handleClick(i) {
		const squares = this.state.squares.slice();
		let status = calculateWinner(squares);
		if (status || squares[i]) {
			return;
		}
		
		if (this.props.mode === 'create' && this.state.xIsNext === true) {
			squares[i] = 'X'
			//this.state.xIsNext ? 'X' : 'O';
			this.setState({
				squares: squares,
				xIsNext: false,
			});
		
			socket.emit('move', {"player":squares[i], "position": i,"game_id": this.props.game_id});
		} else if (this.props.mode === 'join' && this.state.xIsNext === false){
			squares[i] = 'O'
			
			this.setState({
				squares: squares,
				xIsNext: true,
			});
		
			socket.emit('move', {"player":squares[i], "position": i,"game_id": this.props.game_id});
		}
		
		
	}
	renderSquare(i) {
		return (<Square
			value={this.state.squares[i]}
			onClick={() => this.handleClick(i)}
		/>);
	}

	render() {
		const winner = calculateWinner(this.state.squares);
		let status;
		if (winner) {
			status = winner;
			
		} else {
			status = 'Next player: ' + (this.state.xIsNext ? (this.props.mode === 'create' ? 'You' : 'X') : (this.props.mode === 'join' ? 'You' : 'O'));
		}

		return (
			<div className="game-board">
				<div className="status"><h2>{status}</h2></div>
				<div className="board-area">
					<div className="board-row">
						{this.renderSquare(0)}
						{this.renderSquare(1)}
						{this.renderSquare(2)}
					</div>
					<div className="board-row">
						{this.renderSquare(3)}
						{this.renderSquare(4)}
						{this.renderSquare(5)}
					</div>
					<div className="board-row">
						{this.renderSquare(6)}
						{this.renderSquare(7)}
						{this.renderSquare(8)}
					</div>
				</div>
				<p>Playing as : <b>{this.props.mode === 'create' ? 'X' : 'O'}</b></p>
				{this.state.enableRestart === true ? 
				<button onClick={() => this.restartGame()}>Restart</button> : null}
				
			</div>
		);
	}
}

class Game extends React.Component {
	render() {
		return (
				<div className="game">
					<Board game_id={this.props.game_id} mode={this.props.mode}/>
				</div>
		);
	}
}

function calculateWinner(squares) {
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
			if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
				return 'Winner :' + squares[a];
				
			}
	}
	if (squares.includes(null) === false) {
		return 'Game Tied'
	} 
	return null;
}

class App extends React.Component {
	constructor(props){
		super(props);
		this.state = {
			online: 0
		}
	}
	componentDidMount(){
		if (this.props.location.state !== undefined) {
			socket.emit('join', {"game_id": this.props.location.state.gameID, "player" : (this.props.location.state.mode === 'create' ? "X" : "O")});
		}
		socket.on('connected', (data)=>this.connected(data))
		socket.on('disconnected', (data)=>this.connected(data))
	}

	connected(data){
		this.setState({online: data.online.length});
	}

	componentWillUnmount(){
		if (this.props.location.state !== undefined) {
			socket.emit('leave', {"game_id": this.props.location.state.gameID, "player" : (this.props.location.state.mode === 'create' ? "X" : "O")});
		}
	}

	render(){
		return (
			(this.props.location.state === undefined ? <Redirect to='/' /> : 
			<div className="window">
				<Link to="/" className="goHome">Go Home</Link>
				<p className="online">Joined : {this.state.online} </p>
				<div className="parent">
					<Game game_id={this.props.location.state.gameID} mode={this.props.location.state.mode}/>
					
				</div>
				<p className="gameID_Info">Game : {this.props.location.state.gameID}</p>
			</div>
			)
		);
	}
}

export default App;