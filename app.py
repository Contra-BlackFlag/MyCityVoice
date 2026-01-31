from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask import render_template
from datetime import datetime


app = Flask(__name__)
app.config["SQLACHEMY_DATABASE_URI"] = "sqlite:///MyCityVoice.db"
db = SQLAlchemy(app=app)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(15), nullable = False)
    password = db.Column(db.String(15), nullable = False)
    date_of_login = db.Column(db.DateTime,default = datetime.utcnow)
      


@app.route("/")
def Login():
    return render_template("Login.html")

if __name__ in "__main__":
    app.run(debug=True)