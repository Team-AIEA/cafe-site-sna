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
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://38.244.138.103:22594"]}}, supports_credentials=True) #TODO: change to production domain
# CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}}, supports_credentials=True)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
db = SQLAlchemy(app)

# 👑 Admin users
class AdminUser(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurant.id'), nullable=False)
    superuser = db.Column(db.Boolean, default=False)  # 🔥 New field!

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

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'working_hours': self.working_hours,
            'contact_info': self.contact_info,
            'description': self.description,
            'items': [item.to_dict() for item in self.items]
        }

# 📦 Order
class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.Integer, nullable=False)
    table_id = db.Column(db.Integer, nullable=False)
    order_number = db.Column(db.Integer, nullable=False)
    items = db.Column(JSON, nullable=True)  # { "item_id": quantity, ... }
    total_cost = db.Column(db.Integer, nullable=False)
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
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'src': self.src,
            'description': self.description,
            'available': self.available,
            'restaurant_id': self.restaurant_id
        }

class LowLevelItem():
    def __init__(self, item_id, quantity):
        self.id = item_id
        item = Item.query.get(item_id)
        try:
            self.quantity = quantity
            self.price = item.price
            self.name = item.name
            self.src = item.src
            self.description = item.description
            self.available = item.available
            self.restaurant_id = item.restaurant_id
        except Exception as e:
            print(f"Error initializing LowLevelItem: {e}")
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'quantity': self.quantity,
            'src': self.src,
            'description': self.description,
            'available': self.available,
            'restaurant_id': self.restaurant_id
        }

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
    token = jwt.encode(payload, app.secret_key, algorithm='HS256')# app.secret_key, algorithm='HS256')
    return token

# Utility function to validate the token and retrieve the user
def validate_token(token:str):
    print("Validating token:", token)
    try:
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        print('Payload:', payload, 'Payload user id', payload['user_id'])
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
        auth_header = request.headers.get('Authorization')
        print("Request:", request.headers)
        print("Authorization header:", auth_header)
        if not auth_header or not auth_header.startswith('Bearer '):
            print("Not an admin 1")
            return jsonify({'error': 'Admin access required'}), 403

        token = auth_header.replace('Bearer ', '')

        user = validate_token(token)
        if not user or not isinstance(user, AdminUser):
            print("Not an admin 2")
            return jsonify({'error': 'Admin access required'}), 403

        login_user(user)
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
        # response.set_cookie('access_token', token, httponly=True, secure=False)  #TODO: Use secure=True in production
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
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Admin access required'}), 403
    token = auth_header.replace('Bearer ', '')
    user = validate_token(token)
    if not user or not isinstance(user, AdminUser):
        return jsonify({'error': 'Admin access required'}), 403
    if not user.superuser:
        return jsonify({'error': 'Admin super access required'}), 403
        
    data = request.get_json()
    print(data)
    if not data or 'username' not in data or 'password' not in data or 'restaurant_id' not in data:
        return jsonify({'error': 'Invalid input. Username, password, and restaurant_id are required.'}), 400

    # Check if the username already exists
    if AdminUser.query.filter_by(username=data['username']).first():
        print('Username already exists')
        return jsonify({'error': 'Username already exists'}), 400

    # Validate restaurant_id
    restaurant = Restaurant.query.get(data['restaurant_id'])
    if not restaurant:
        return jsonify({'error': 'Invalid restaurant_id. Restaurant does not exist.'}), 400

    new_admin = AdminUser(
        username=data['username'],
        restaurant_id=data['restaurant_id'],
        superuser=data.get('superuser', False)  # Default to False if not passed
    )
    new_admin.set_password(data['password'])
    db.session.add(new_admin)
    db.session.commit()


    return jsonify({'message': 'User created successfully'}), 201


@app.route('/api/orders', methods=['GET'])
@admin_required
def list_orders():
    orders = Order.query.all()
    return jsonify({'orders': [
        {
            'id': o.id,
            'status': o.status,
            'table_id': o.table_id,
            'order_number': o.order_number,
            'items': o.items,
            'total_cost': o.total_cost,
            'restaurant_id': o.restaurant_id
        } for o in orders
    ]}), 200


@app.route('/api/order/<int:order_id>', methods=['GET', 'PUT'])
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

    elif request.method == 'PUT':
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Admin access required'}), 403
        token = auth_header.replace('Bearer ', '')
        user = validate_token(token)
        if not user or not isinstance(user, AdminUser):
            return jsonify({'error': 'Admin access required'}), 403

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404

        data = request.get_json()
        try:
            if (not user.superuser and order.restaurant_id != user.restaurant_id):
                return jsonify({'error': 'Admin super access required or edit only your restaurant orders'}), 403
            if 'status' in data:
                print('Status:', data['status'])
                print(int(data['status']) not in [0, 1, 2, 3])
                if int(data['status']) not in [0, 1, 2, 3]:  # Assuming status can be 0 (placed), 1 (in progress), 2 (completed) or 3 (canceled)
                    return jsonify({'error': 'Invalid status value'}), 400
                elif order.status == 3:
                    return jsonify({'error': 'Order already canceled'}), 400
                elif order.status == 2:
                    return jsonify({'error': 'Order already completed'}), 400
                elif order.status == 0 and int(data['status']) == 1:
                    order.status = 1
                elif order.status == 0 and int(data['status']) == 2:
                    order.status = 2
                elif order.status == 0 and int(data['status']) == 3:
                    order.status = 3
                elif order.status == 0 and int(data['status']) == 3:
                    order.status = 3
                elif order.status == 1 and int(data['status']) == 2:
                    order.status = 2
                elif order.status == 1 and int(data['status']) == 3:
                    order.status = 3
                elif order.status == 0 and int(data['status']) == 3:
                    order.status = 3
                else:
                    return jsonify({'error': 'Invalid status transition'}), 400
                
            db.session.commit()
            return jsonify({'message': 'Order updated'}), 200
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid input'}), 400

@app.route('/api/order/', methods=['POST'])
def orderNew():
    data = request.get_json()
    print('Data:', data)
    try:
        restaurant_id = int(data.get('restaurant_id'))
        table_id = int(data.get('table_id'))
        items = data.get('items', {})  # {"item_id": quantity}
        
        if not isinstance(items, dict) or not all(isinstance(v, int) for v in items.values()):
            return jsonify({'error': 'Invalid items format. Expected a dictionary of {"item_id": quantity}'}), 410

        new_items = []
        for item_id, quantity in items.items():
            new_items.append(LowLevelItem(item_id, quantity))

        order_number = int(datetime.now().timestamp())
        status = 0  # Order placed

        total_cost = sum(item.price * item.quantity for item in new_items)

        new_order = Order(
            total_cost=total_cost,
            table_id=table_id,
            order_number=order_number,
            status=status,
            items=[item.to_dict() for item in new_items],
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
                'src': item.src,
                'price': item.price,
                'available': item.available,
                'restaurant_id': item.restaurant_id
            } for item in items
        ]), 200

    elif request.method == 'POST':
        # Admin-only access
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Admin access required'}), 403
        token = auth_header.replace('Bearer ', '')
        user = validate_token(token)
        if not user or not isinstance(user, AdminUser):
            return jsonify({'error': 'Admin access required'}), 403
        data = request.get_json()
        try:
            new_item = Item(
                name=data['name'],
                description=data.get('description', ''),
                price=int(data['price']),
                available=bool(data.get('available', True)),
                restaurant_id=data.get('restaurant_id'),
                src=data.get('src', '')
            )
            if (not user.superuser and new_item.restaurant_id != user.restaurant_id):
                return jsonify({'error': 'Admin super access required or edit only your restaurant'}), 403
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
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Admin access required'}), 403
        token = auth_header.replace('Bearer ', '')
        user = validate_token(token)
        if not user or not isinstance(user, AdminUser):
            return jsonify({'error': 'Admin access required'}), 403
        data = request.get_json()
        try:
            item.name = data.get('name', item.name)
            item.src = data.get('src', item.src)
            item.description = data.get('description', item.description)
            item.price = int(data.get('price', item.price))
            item.available = bool(data.get('available', item.available))
            item.restaurant_id = data.get('restaurant_id', item.restaurant_id)
            if (not user.superuser and item.restaurant_id != user.restaurant_id):
                return jsonify({'error': 'Admin super access required or edit only your restaurant items'}), 403
            db.session.commit()
            return jsonify({'status': 'Updated'})
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid input'}), 400

    elif request.method == 'DELETE':
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Admin access required'}), 403
        token = auth_header.replace('Bearer ', '')
        user = validate_token(token)
        if not user or not isinstance(user, AdminUser):
            return jsonify({'error': 'Admin access required'}), 403
        db.session.delete(item)
        db.session.commit()
        return jsonify({'status': 'Deleted'})


@app.route('/api/user', methods=['GET'])
@admin_required
def get_user():
    return jsonify({
        'id': current_user.id,
        'superuser': current_user.superuser,
        'username': current_user.username,
        'restaurant_id': current_user.restaurant_id
    }), 200


@app.route('/api/restaurants', methods=['GET', 'POST'])
def handle_restaurants():
    if request.method == 'GET':
        # Retrieve all restaurants
        restaurants = Restaurant.query.all()
        to_return = [r.to_dict() for r in restaurants]
        return jsonify(to_return), 200

    elif request.method == 'POST':
        # Add a new restaurant (Admin-only access)
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Admin access required'}), 403
        token = auth_header.replace('Bearer ', '')
        user = validate_token(token)
        if not user or not isinstance(user, AdminUser):
            return jsonify({'error': 'Admin access required'}), 403
        if not user.superuser:
            return jsonify({'error': 'Admin super access required'}), 403
        
        data = request.get_json()
        try:
            new_restaurant = Restaurant(
                name=data['name'],
                address=data['address'],
                working_hours=data.get('working_hours', ''),
                contact_info=data.get('contact_info', ''),
                description=data.get('description', '')
            )
            db.session.add(new_restaurant)
            db.session.commit()
            return jsonify({'message': 'Restaurant created', 'id': new_restaurant.id}), 201
        except (KeyError, ValueError):
            return jsonify({'error': 'Invalid input'}), 400


@app.route('/api/restaurants/<int:restaurant_id>', methods=['GET', 'PUT'])
def update_restaurant(restaurant_id):
    if request.method == 'GET':
        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({'error': 'Restaurant not found'}), 404
        return jsonify({
            'id': restaurant.id,
            'name': restaurant.name,
            'address': restaurant.address,
            'working_hours': restaurant.working_hours,
            'contact_info': restaurant.contact_info,
            'description': restaurant.description,
            'items': [item.to_dict() for item in restaurant.items]
        })
    elif request.method == 'PUT':
        # Admin-only access
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Admin access required'}), 403
        token = auth_header.replace('Bearer ', '')
        user = validate_token(token)
        if not user or not isinstance(user, AdminUser):
            return jsonify({'error': 'Admin access required'}), 403
        # Update an existing restaurant
        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({'error': 'Restaurant not found'}), 404
        if (not user.superuser and restaurant.id != user.restaurant_id):
            return jsonify({'error': 'Admin super access required or edit only your restaurant'}), 403
        data = request.get_json()
        try:
            restaurant.name = data.get('name', restaurant.name)
            restaurant.address = data.get('address', restaurant.address)
            restaurant.working_hours = data.get('working_hours', restaurant.working_hours)
            restaurant.contact_info = data.get('contact_info', restaurant.contact_info)
            restaurant.description = data.get('description', restaurant.description)
            db.session.commit()
            return jsonify({'message': 'Restaurant updated'}), 200
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid input'}), 400


# Sample user creation function
def add_sample_user():
    # Create a sample user
    new_user = AdminUser(
        username="admin",
        restaurant_id=0,
        superuser=True  # Set to True for superuser
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
        'src': "https://plus.unsplash.com/premium_photo-1668771085743-1d2d19818140?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fHBpenphfGVufDB8fDB8fHww"
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

def getPrice(item_id):
    item = Item.query.get(item_id)
    if item:
        return item.price
    return None

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=8000, debug=True)
    # with app.app_context():
    #     db.drop_all()