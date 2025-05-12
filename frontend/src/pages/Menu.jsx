import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuItem from '../components/MenuItem.jsx'

function Menu() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const table_id = queryParams.get('table');
    const restaurant_id = queryParams.get('restaurant');
    
  const [items, setItems] = useState([]);
    const [cart, setCart] = useState(() => {
        // Load cart from localStorage
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : {};
    });

    useEffect(() => {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        // Fetch menu items from the backend
        fetch(`${API_BASE_URL}/api/items`, {
            method: 'GET',
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to fetch menu items');
                }
                return response.json();
            })
            .then((data) => {
                setItems(data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }, []);

    function addToCart(itemId, inc){
        const updatedCart = { ...cart };
        updatedCart[itemId] = (updatedCart[itemId] || 0) + inc; // Increment quantity
        setCart(updatedCart);
        console.log("Set cart")
        localStorage.setItem('cart', JSON.stringify(updatedCart)); // Save cart to localStorage
    }
    
    function getItems(itemId){
        return  cart[itemId];
    }

    function placeOrder(){
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const token = localStorage.getItem('access_token');
        const aboba = localStorage.getItem('cart');
        console.log(aboba)
        if (!token) {
            console.log('You must be logged in to place an order.');
        }

        fetch(`${API_BASE_URL}/api/order/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ table_id, restaurant_id, items: cart }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to place order');
                }
                return response.json();
            })
            .then((data) => {
                console.log('Order placed successfully!');
                localStorage.setItem('order_id', data.id);
                setCart({}); // Clear cart
                localStorage.removeItem('cart'); // Remove cart from localStorage
                navigate(`/order/${data.id}`); // Redirect to order details page using order ID
            })
            .catch((error) => {
                console.error('Error:', error);
                alert('Failed to place order. Please try again.');
            });
    }

    return (
        <div>
        <a href="/cart"><img className='butt-down' src='../src/assets/cart.png'></img></a>
        <h1>Food & Drinks</h1>
        <div className='menu-div'>
                {items.map((item) => (
                    <MenuItem id={item.id} name={item.name} price={item.price} onAddToCart={addToCart} img={item.src} val={getItems(item.id)}/>
                ))}
            <button onClick={placeOrder} disabled={Object.keys(cart).length === 0}>
                Place Order
            </button>
        </div>
        </div>
    );
}

export default Menu;