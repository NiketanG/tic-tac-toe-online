import os

class Config:
    SECRET_KEY = '57bde4dd-0da1-41dd-b5bc-38d5997d0fc1'
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:N!kketanGT16@localhost/tictactoe'
    #os.getenv('SQLALCHEMY_DATABASE_URI')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    