from flask import render_template, Blueprint,flash, request, send_from_directory, current_app as app
from app.models import Game
from app import db, socketio
import json
import random
from flask_socketio import join_room, leave_room
game_blueprint = Blueprint('game', __name__)

@game_blueprint.route('/')
def index():
    return render_template('index.html')

@game_blueprint.route('/Game')
def game():
    return render_template('index.html')


@game_blueprint.route('/Info')
def info():
    return render_template('index.html')

@game_blueprint.route('/api/create/game')
def create_game():
    game_id = random.randint(0,99999)
    game = Game.query.filter_by(game_id=game_id).first()
    while game:
        game_id = random.randint(0,99999)
    board = {}
    for i in range(9):
        board.update({i:None})
    curr_game = Game(game_id=game_id, next='X', board=json.dumps(board), online='[]')
    try:
        db.session.add(curr_game)
        db.session.commit()
        print('Game Created ' + str(game_id))
    except Exception as e:
        print(e)
        db.session.rollback()
    return {'result':'success', 'game_id':game_id}


@game_blueprint.route('/api/delete/game/<int:game_id>')
def delete_game(game_id):
    game = Game.query.filter_by(game_id=game_id).first()
    if game:
        try:
            db.session.delete(game)
            db.session.commit()
            print('Game Deleted ' + game_id)
            return {'result':'success', 'game_id':game_id}
        except Exception as e:
            db.session.rollback()
            print(e)
        return {'result':'fail'}
    else:
        return {'result':'fail', 'reason': "Game ID not Found"}

@game_blueprint.route('/api/search/game', methods=['GET', 'POST'])
def search_game():
    received_data = request.json
    game_id = received_data.get('game_id')
    curr_game = Game.query.filter_by(game_id=game_id).first()
    if curr_game:
        print('Game Found ' + game_id)
        return {'result': 'success', 'online':len(json.loads(curr_game.online))}
    else:
        return {'result': 'fail'}

@game_blueprint.route('/api/fetch/game/<int:game_id>')
def fetch_game(game_id):
    curr_game = Game.query.filter_by(game_id=game_id).first()
    if curr_game:
        try:
            if curr_game.board is None:
                board = {}
            else:
                board = json.loads(curr_game.board)  
                board_vals = []
            for k,v in board.items(): board_vals.append(v)
        except Exception as e:
            print(e)
        print(board_vals)
        return {'result' :'success', 'board': board_vals, 'next':curr_game.next}
    else:
        return {'result' :'fail', 'reason': "Game ID not found"}
        
@socketio.on('join', namespace='/Game')
def on_join(data):
    game_id = data.get('game_id')
    player = data.get('player')
    join_room(str(game_id))
    curr_game = Game.query.filter_by(game_id=game_id).first()
    if curr_game:
            online = json.loads(curr_game.online)
            if player not in online:
                online.append(player)
            curr_game.online = json.dumps(online)
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(e)
            print('Joined')
            socketio.emit('connected', {'game_id': game_id, 'online':online}, room=str(game_id), namespace='/Game')

@socketio.on('leave', namespace='/Game')
def on_leave(data):
    game_id = data.get('game_id')
    player = data.get('player')
    leave_room(str(game_id))
    curr_game = Game.query.filter_by(game_id=game_id).first()
    if curr_game:
        try:
            online = json.loads(curr_game.online)
            if player in online:
                online.remove(player)
            curr_game.online = json.dumps(online)
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(e)
            socketio.emit('disconnected', {'game_id': game_id, 'online':online}, room=str(game_id), namespace='/Game')
            
            #Delete rooms automatically after both players leave
            if (len(json.loads(curr_game.online)) == 0):
                try:
                    db.session.delete(curr_game)
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    print(e)
        except Exception as e:
            db.session.rollback()
            print(e)

@socketio.on('move', namespace='/Game')
def handle_move(move_data):
    player = move_data.get('player')
    position = move_data.get('position')
    game_id = move_data.get('game_id')
    curr_game = Game.query.filter_by(game_id=game_id).first()
    if curr_game:
        try:
            board = json.loads(curr_game.board)
            board[str(position)] = str(player)
            curr_game.board = json.dumps(board)
            if player == 'X':
                curr_game.next = 'O'
            elif player == 'O':
                curr_game.next = 'X'
            db.session.commit()

            board_vals = []
            for k,v in board.items(): board_vals.append(v)
            socketio.emit('moved', {'player': player, 'next': curr_game.next, 'position': position}, room=str(game_id), namespace='/Game')
            #socketio.emit('moved', {'board': board_vals, 'next': curr_game.next, 'game_id': game_id}, room=str(game_id))
        except Exception as e:
            print(e)
            db.session.rollback()

@socketio.on('restartGame', namespace='/Game')
def restartGame(data):
    game_id = data.get('game_id')
    curr_game = Game.query.filter_by(game_id=game_id).first()
    if curr_game:
        print('Game Found ' + str(game_id))
        board = {}
        for i in range(9):
            board.update({i:None})
        curr_game.board = json.dumps(board)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(e)
        socketio.emit('restarted', room=str(game_id), namespace='/Game')
    else:
        return {'result': 'fail'}