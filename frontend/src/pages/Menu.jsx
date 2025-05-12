import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Menu() {
    const navigate = useNavigate();
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

    const addToCart = (itemId) => {
        const updatedCart = { ...cart };
        updatedCart[itemId] = (updatedCart[itemId] || 0) + 1; // Increment quantity
        setCart(updatedCart);
        console.log("Set cart")
        localStorage.setItem('cart', JSON.stringify(updatedCart)); // Save cart to localStorage
    };

    const placeOrder = () => {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const token = localStorage.getItem('access_token');
        const aboba = localStorage.getItem('cart');
        console.log(aboba)
        if (!token) {
            console.log('You must be logged in to place an order.');
        }

        const table_id = 0; // Replace with actual table_id logic if needed

        fetch(`${API_BASE_URL}/api/order/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ table_id, items: cart }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to place order');
                }
                return response.json();
            })
            .then((data) => {
                alert('Order placed successfully!');
                setCart({}); // Clear cart
                localStorage.removeItem('cart'); // Remove cart from localStorage
                navigate(`/order/${data.id}`); // Redirect to order details page using order ID
            })
            .catch((error) => {
                console.error('Error:', error);
                alert('Failed to place order. Please try again.');
            });
    };

    return (
        <div>
            <h1>Menu</h1>
            <ul>
                {items.map((item) => (
                    <li key={item.id}>
                        {item.name} - ${item.price}
                        <button onClick={() => addToCart(item.id)}>Add to Cart</button>
                    </li>
                ))}
            </ul>
            <button onClick={placeOrder} disabled={Object.keys(cart).length === 0}>
                Place Order
            </button>
        </div>
    );
}

export default Menu;