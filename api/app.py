from flask import Flask, flash, jsonify, redirect, render_template, request, url_for
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSON
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from functools import wraps
import os
import jwt
from datetime import datetime, timedelta
from flask_cors import CORS

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')

login_manager = LoginManager()
login_manager.init_app(app)

# Enable CORS for the Flask app
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
db = SQLAlchemy(app)

# 👑 Admin users
class AdminUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
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
    address = db.Column(db.String(255), nullable=False)  # Physical address of the restaurant
    working_hours = db.Column(db.String(100), nullable=True)  # e.g., "9:00 AM - 10:00 PM"
    contact_info = db.Column(db.String(100), nullable=True)  # Phone or email
    description = db.Column(db.Text, nullable=True)  # Brief description of the restaurant

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


@login_manager.user_loader
def load_user(user_id):
    return AdminUser.query.get(int(user_id))


def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.now() + timedelta(hours=1),  # Token expires in 1 hour
        'iat': datetime.now()  # Issued at time
    }
    token = jwt.encode(payload, "hi", algorithm='HS256')# app.secret_key, algorithm='HS256')
    return token

# Utility function to validate the token and retrieve the user
def validate_token(token):
    try:
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = AdminUser.query.get(payload['user_id'])
        if user:
            return user
    except jwt.ExpiredSignatureError:
        return None  # Token has expired
    except jwt.InvalidTokenError:
        return None  # Invalid token
    return None


# Utility function to check if the current user is an admin
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not isinstance(current_user, AdminUser):
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


@app.route('/api/', methods=['GET'])
def index():
    add_sample_user()
    return "It's API page. No content here :("


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Invalid input'}), 400

    user = AdminUser.query.filter_by(username=data['username']).first()
    if user and user.check_password(data['password']):
        # Generate a token (e.g., JWT)
        token = generate_token(user.id)  # Replace with your token generation logic
        return jsonify({'message': 'Logged in', 'token': token}), 200

    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/logout', methods=['GET'])
@admin_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'}), 200


@app.route('/api/signup', methods=['POST'])
@admin_required
def signup():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data or 'restaurant_id' not in data:
        return jsonify({'error': 'Invalid input. Username, password, and restaurant_id are required.'}), 400

    # Check if the username already exists
    if AdminUser.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400

    # Validate restaurant_id
    restaurant = Restaurant.query.get(data['restaurant_id'])
    if not restaurant:
        return jsonify({'error': 'Invalid restaurant_id. Restaurant does not exist.'}), 400

    # Create a new AdminUser
    new_user = AdminUser(
        username=data['username'],
        restaurant_id=data['restaurant_id']
    )
    new_user.set_password(data['password'])

    # Save the new user to the database
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201


@app.route('/api/orders', methods=['GET'])
@admin_required
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

@app.route('/api/order/', methods=['POST'])
def orderNew():
    data = request.get_json()
    print(request.get_json())
    try:
        table_id = int(data.get('table_id'))
        items = data.get('items', {})  # Expecting a dictionary {"item_id": quantity}

        print(items,'\n',isinstance(items, dict), all(isinstance(v, int) for v in items.values()))
        if not isinstance(items, dict) or not all(isinstance(v, int) for v in items.values()):
            return jsonify({'error': 'Invalid items format. Expected a dictionary of {"item_id": quantity}'}), 400

        # Generate a unique order number (e.g., based on timestamp)
        order_number = int(datetime.utcnow().timestamp())
        status = 0  # Default to 0 = order placed

        new_order = Order(
            table_id=table_id,
            order_number=order_number,
            status=status,
            items=items,
            restaurant_id=0  # Replace with logic to determine restaurant_id if needed
        )
        db.session.add(new_order)
        db.session.commit()
        return jsonify({'message': 'Order created', 'id': new_order.id}), 201

    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid input'}), 400


@app.route('/api/items', methods=['GET', 'POST'])
def handle_items():
    if request.method == 'GET':
        # Publicly accessible, return all items
        items = Item.query.all()
        return jsonify([
            {
                'id': item.id,
                'name': item.name,
                'description': item.description,
                'price': item.price,
                'available': item.available,
                'restaurant_id': item.restaurant_id
            } for item in items
        ]), 200

    elif request.method == 'POST':
        # Admin-only access
        if not current_user.is_authenticated or not isinstance(current_user, AdminUser):
            return jsonify({'error': 'Admin access required'}), 403
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


@app.route('/api/user', methods=['GET'])
# @admin_required
def get_user():
    print(1)
    print(current_user)
    if not current_user.is_authenticated:
        print('No token found, redirecting to login');
        return jsonify({'error': 'Unauthorized'}), 401
    print(2)
    return jsonify({
        'id': current_user.id,
        'username': current_user.username
    }), 200


# Sample user creation function
def add_sample_user():
    # Create a sample user
    new_user = AdminUser(
        username="admin",
        restaurant_id=0
    )
    new_user.set_password("admin")

    new_rest = Restaurant(
        name="Sample Restaurant",
        address="123 Sample St, Sample City",
        working_hours="9:00 AM - 10:00 PM",
        contact_info="123-456-7890",
        description="A sample restaurant for testing purposes.",
    )
    new_item = Item(
        name="Sample Item",
        description="A sample item for testing purposes.",
        price=10,
        available=True,
        restaurant_id=0,
    )

    # Save to the database
    
    db.session.add(new_rest)
    db.session.query(Restaurant).filter_by(name="Sample Restaurant").update({"id": 0})
    db.session.add(new_user)
    db.session.add(new_item)
    db.session.commit()


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # db.drop_all()
    app.run(host='0.0.0.0', port=8000, debug=True)