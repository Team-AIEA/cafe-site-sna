from flask import Flask, flash, jsonify, redirect, render_template, request, url_for
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSON
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from functools import wraps
import os
import jwt
from datetime import datetime, timedelta, timezone
from flask_cors import CORS

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')

login_manager = LoginManager()
login_manager.init_app(app)

# Enable CORS for the Flask app
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "38.244.138.103:22594"]}}) #TODO: change to production domain

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
db = SQLAlchemy(app)

# 👑 Admin users
class AdminUser(UserMixin, db.Model):
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
    src = db.Column(db.Text, nullable=True)
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
        'exp': datetime.now(timezone.utc) + timedelta(hours=1),
        'iat': datetime.now(timezone.utc)

    }
    token = jwt.encode(payload, "hi", algorithm='HS256')# app.secret_key, algorithm='HS256')
    return token

# Utility function to validate the token and retrieve the user
def validate_token(token):
    try:
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = AdminUser.query.get(payload['user_id'])
        if user:
            print('User found:', user.username)
            return user
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        return None  # Token has expired
    except jwt.InvalidTokenError:
        print("Invalid token")
        return None  # Invalid token
    return None


# Utility function to check if the current user is an admin
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        print("Checking...")
        token = request.cookies.get('access_token')
        if not token:
            print("No token found")
            return jsonify({'error': 'Admin access required'}), 403

        user = validate_token(token)
        if not user or not isinstance(user, AdminUser):
            print("Not an admin")
            return jsonify({'error': 'Admin access required'}), 403

        login_user(user)  # Set the user as the current_user
        print("Admin access granted")
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
        print("Token generated:", token)
        login_user(user)  # sets current_user
        print(current_user.is_authenticated)

        # Set the token in a secure cookie
        response = jsonify({'message': 'Logged in', 'token': token})
        response.set_cookie('access_token', token, httponly=True, secure=False)  #TODO: Use secure=True in production
        return response, 200

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

    # elif request.method == 'POST':
    #     data = request.get_json()
    #     try:
    #         table_id = int(data.get('table_id'))
    #         order_number = int(data.get('order_number'))
    #         status = int(data.get('status', 0))  # Default to 0 = order placed
    #         items = data.get('items', {})
    #     except (TypeError, ValueError):
    #         return jsonify({'error': 'Invalid input'}), 400

    #     new_order = Order(table_id=table_id, order_number=order_number, status=status, items=items, restaurant_id=data.get('restaurant_id'))  # Update restaurant_id as needed
    #     db.session.add(new_order)
    #     db.session.commit()
    #     return jsonify({'message': 'Order created', 'id': new_order.id}), 201

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
        restaurant_id = int(data.get('restaurant_id'))
        table_id = int(data.get('table_id'))
        items = data.get('items', {})  # Expecting a dictionary {"item_id": quantity}

        print(items,'\n',isinstance(items, dict), all(isinstance(v, int) for v in items.values()))
        if not isinstance(items, dict) or not all(isinstance(v, int) for v in items.values()):
            return jsonify({'error': 'Invalid items format. Expected a dictionary of {"item_id": quantity}'}), 400

        # Generate a unique order number (e.g., based on timestamp)
        order_number = int(datetime.now().timestamp())
        status = 0  # Default to 0 = order placed

        new_order = Order(
            table_id=table_id,
            order_number=order_number,
            status=status,
            items=items,
            restaurant_id=restaurant_id
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
            'src': item.src,
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
@admin_required
def get_user():
    print(1)
    print(current_user)
    # if not current_user.is_authenticated:
    #     print('No token found, redirecting to login')
    #     return jsonify({'error': 'Unauthorized'}), 401
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

    # Save to the database
    db.session.add(new_rest)
    db.session.query(Restaurant).filter_by(name="Sample Restaurant").update({"id": 0})
    db.session.add(new_user)
    a = [{
        'name': 'Pizza',
        'src': "https://www.hollywoodreporter.com/wp-content/uploads/2012/12/img_logo_blue.jpg?w=1440&h=810&crop=1"
    },
    {
        'name': 'Burger',
        'src': "https://plus.unsplash.com/premium_photo-1683619761468-b06992704398?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YnVyZ2VyfGVufDB8fDB8fHww"
    },
    {
        'name': 'Fries',
        'src': "https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZnJpZXN8ZW58MHx8MHx8fDA%3D"
    },
        {
        'name': 'Steak',
        'src': "https://plus.unsplash.com/premium_photo-1723672929404-36ba6ed8ab50?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8c3RlYWt8ZW58MHx8MHx8fDA%3D"
    },
    {
        'name': 'Cake',
        'src': "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8Y2FrZXxlbnwwfHwwfHx8MA%3D%3D"
    },
    {
        'name': 'Coffee',
        'src': "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y29mZmVlfGVufDB8fDB8fHww"
    },
    {
        'name': 'Long Island iced tea',
        'src': "https://plus.unsplash.com/premium_photo-1721832905378-cf785bd21033?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bG9uZyUyMGlzbGFuZCUyMGNvY2t0YWlsfGVufDB8fDB8fHww"
    },
    {
        'name': 'Salad',
        'src': "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2FsYWR8ZW58MHx8MHx8fDA%3D"
    },
    {
        'name': 'Combo breakfast',
        'src': "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnJlYWtmYXN0fGVufDB8fDB8fHww"
    },
    ]
    for i in range(9):
        new_item = Item(
            name=a[i]['name'],
            description="A sample item for testing purposes.",
            src=a[i]['src'],
            price=10*(i+1),
            available=True,
            restaurant_id=0,
        )
        db.session.add(new_item)

    db.session.commit()


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=8000, debug=True)
    # with app.app_context():
    #     db.drop_all()