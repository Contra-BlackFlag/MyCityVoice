from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)

# ---------------- CONFIG ----------------
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///MyCityVoice.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "change-this-secret"

db = SQLAlchemy(app)
jwt = JWTManager(app)

# ---------------- MODELS ----------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    complaints = db.relationship("Complaint", backref="user", lazy=True)


class Complaint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)



@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json()

    if not data or not data.get("username") or not data.get("password"):
        return jsonify({"error": "Missing fields"}), 400

    if User.query.filter_by(user_name=data["username"]).first():
        return jsonify({"error": "Username already exists"}), 409

    user = User(
        user_name=data["username"],
        password=generate_password_hash(data["password"])
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created successfully"}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    user = User.query.filter_by(user_name=data.get("username")).first()

    if not user or not check_password_hash(user.password, data.get("password")):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=user.id)

    return jsonify({
        "access_token": token,
        "user_id": user.id,
        "username": user.user_name
    }), 200



@app.route("/api/complaints", methods=["POST"])
@jwt_required()
def create_complaint():
    user_id = get_jwt_identity()
    data = request.get_json()

    complaint = Complaint(
        title=data["title"],
        description=data["description"],
        user_id=user_id
    )

    db.session.add(complaint)
    db.session.commit()

    return jsonify({"message": "Complaint created"}), 201


@app.route("/api/complaints", methods=["GET"])
@jwt_required()
def get_my_complaints():
    user_id = get_jwt_identity()

    complaints = Complaint.query.filter_by(user_id=user_id).all()

    return jsonify([
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "created_at": c.created_at.isoformat()
        } for c in complaints
    ]), 200


@app.route("/api/complaints/all", methods=["GET"])
@jwt_required()
def get_all_complaints():
    complaints = Complaint.query.all()

    return jsonify([
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "user": c.user.user_name,
            "created_at": c.created_at.isoformat()
        } for c in complaints
    ]), 200


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
