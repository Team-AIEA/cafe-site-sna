from flask import Flask, flash, jsonify, redirect, render_template, request, url_for
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSON
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')

login_manager = LoginManager()
login_manager.init_app(app)


app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
db = SQLAlchemy(app)

# 👑 Admin users
class AdminUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def get_id(self):
        return str(self.id)

# 🍽️ Restaurant
class Restaurant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)

    items = db.relationship('Item', backref='restaurant', lazy=True)
    orders = db.relationship('Order', backref='restaurant', lazy=True)
    admins = db.relationship('AdminUser', backref='restaurant', lazy=True)

# 📦 Order
class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.Integer, nullable=False)
    table_id = db.Column(db.Integer, nullable=False)
    order_number = db.Column(db.Integer, nullable=False)
    items = db.Column(JSON, nullable=True)  # { "item_id": quantity, ... }
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)

# 🛍️ Item
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Integer, nullable=False)
    available = db.Column(db.Boolean, default=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)

with app.app_context():
    db.create_all()

class User(UserMixin):
    def __init__(self, username):
        self.id = username


@login_manager.user_loader
def load_user(user_id):
    return AdminUser.query.get(int(user_id))


    
@app.route('/api/', methods=['GET'])
def index():
    return "It's API page. No content here :("


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Invalid input'}), 400

    user = AdminUser.query.filter_by(username=data['username']).first()
    if user and user.check_password(data['password']):
        login_user(user)
        return jsonify({'message': 'Logged in'}), 200

    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/logout', methods=['GET'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'}), 200


@app.route('/api/orders', methods=['GET'])
@login_required
def list_orders():
    orders = Order.query.all()
    return jsonify([
        {
            'id': o.id,
            'status': o.status,
            'table_id': o.table_id,
            'order_number': o.order_number,
            'items': o.items
        } for o in orders
    ]), 200


@app.route('/api/order/<int:order_id>', methods=['GET', 'POST', 'PUT'])
def order(order_id):
    if request.method == 'GET':
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        return jsonify({
            'id': order.id,
            'table_id': order.table_id,
            'status': order.status,
            'order_number': order.order_number,
            'items': order.items,
            'restaurant_id': order.restaurant_id
        })

    elif request.method == 'POST':
        data = request.get_json()
        try:
            table_id = int(data.get('table_id'))
            order_number = int(data.get('order_number'))
            status = int(data.get('status', 0))  # Default to 0 = order placed
            items = data.get('items', {})
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid input'}), 400

        new_order = Order(table_id=table_id, order_number=order_number, status=status, items=items, restaurant_id=data.get('restaurant_id'))  # Update restaurant_id as needed
        db.session.add(new_order)
        db.session.commit()
        return jsonify({'message': 'Order created', 'id': new_order.id}), 201

    elif request.method == 'PUT':
        if not current_user.is_authenticated:
            return jsonify({'error': 'Unauthorized'}), 401

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404

        data = request.get_json()
        try:
            if 'status' in data:
                order.status = int(data['status'])
            if 'items' in data:
                order.items = data['items']
            db.session.commit()
            return jsonify({'message': 'Order updated'}), 200
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid input'}), 400


@app.route('/api/items', methods=['POST'])
def create_item():
    if not current_user.is_authenticated:
        return "Unauthorized", 401
    data = request.get_json()
    try:
        new_item = Item(
            name=data['name'],
            description=data.get('description', ''),
            price=int(data['price']),
            available=bool(data.get('available', True))
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({'status': 'Created', 'id': new_item.id}), 201
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid input'}), 400


@app.route('/api/items/<int:item_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_item(item_id):
    item = Item.query.get(item_id)
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    if request.method == 'GET':
        return jsonify({
            'id': item.id,
            'name': item.name,
            'description': item.description,
            'price': item.price,
            'available': item.available
        })

    elif request.method == 'PUT':
        if not current_user.is_authenticated:
            return "Unauthorized", 401
        data = request.get_json()
        try:
            item.name = data.get('name', item.name)
            item.description = data.get('description', item.description)
            item.price = int(data.get('price', item.price))
            item.available = bool(data.get('available', item.available))
            db.session.commit()
            return jsonify({'status': 'Updated'})
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid input'}), 400

    elif request.method == 'DELETE':
        if not current_user.is_authenticated:
            return "Unauthorized", 401
        db.session.delete(item)
        db.session.commit()
        return jsonify({'status': 'Deleted'})


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=8000, debug=True)