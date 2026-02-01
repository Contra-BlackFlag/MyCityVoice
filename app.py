from flask import Flask, redirect, request
from flask_sqlalchemy import SQLAlchemy
from flask import render_template
from datetime import datetime


app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///MyCityVoice.db"

db = SQLAlchemy(app=app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(15), nullable = False, unique = True)
    password = db.Column(db.String(15), nullable = False)
    date_of_login = db.Column(db.DateTime,default = datetime.utcnow)
    complaints = db.relationship("complaint", backref = "user", lazy = True)
    def __repr__(self)->str:
        return f"{self.user_name}"

class complaint(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    title = db.Column(db.String(50), nullable = False)
    description = db.Column(db.String(200), nullable = False)
    time_of_creation = db.Column(db.DateTime, default = datetime.date)
    
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable = False
    )
    images = db.relationship("complaintImage", backref = "complaint", lazy = True)
    location = db.relationship("Location", backref = "complaint", uselist =True)

class location(db.Model):
    complaint_id = db.Column(
        db.Integer,
        db.ForeignKey("complaint.id"),
        primary_key = True
    )
    latitude = db.Column(db.Float, nullable = False)
    longitute = db.Column(db.Float, nullable = False)

class ComplaintImages(db.Model):
     id = db.Column(db.Integer, primary_key=True)
     image_path = db.Column(db.String(255), nullable=False)

     complaint_id = db.Column(
        db.Integer,
        db.ForeignKey("complaint.id"),
        nullable=False
     )


@app.route("/testing")
def testing():
    return render_template('testing.html')

@app.route("/sign_up", methods = ["POST","GET"])
def signup():
    if request.method == "POST":
        current_username = request.form["username"]
        current_password = request.form["password"]

        new_user = User(
            user_name=current_username,
            password=current_password
        )

        try:
            db.session.add(new_user)
            db.session.commit()
            return redirect("/testing")
        except Exception as e:
            print(e)
            return "Database error", 500

    return render_template("signup.html")


@app.route("/", methods = ["GET"])
def login():
    return render_template("login.html")

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)