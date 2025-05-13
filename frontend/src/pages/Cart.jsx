import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function placeOrder(){
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
    const token = localStorage.getItem('access_token');
    const aboba = localStorage.getItem('cart');
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const table_id = queryParams.get('table');
    const restaurant_id = queryParams.get('restaurant');
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

function Cart() {

    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    const [itemsInfo, setItemsInfo] = useState({});

    useEffect(() => {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        
        async function fetchItemsInfo() {
            const newItemsInfo = {};
            for (const [itemId] of Object.entries(cart)) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch item details');
                    }
                    const data = await response.json();
                    newItemsInfo[itemId] = data;
                } catch (error) {
                    console.error(`Error fetching item ${itemId}:`, error);
                }
            }
            setItemsInfo(newItemsInfo);
        }

        fetchItemsInfo();
    }, [cart]);

    var total = 0;
    // Object.entries(cart).map(([itemId, item]) => {
    //     const inf = itemsInfo[itemId];
    //     total += inf.price * cart[itemId];});

    return (
        <div className='cart-main'>
            <a href="/"><img className='butt-up' src='../src/assets/back.png' /></a>
            <h1>Cart</h1>
            <div className="cart-items">
                <ul>
                    {Object.entries(cart).map(([itemId, item]) => {
                        const info = itemsInfo[itemId];
                        return (
                            <li key={itemId}>
                                {info ? `${info.name} – ${"$" + info.price} – ${cart[itemId]} – ${"$" + info.price * cart[itemId]}` : 'Loading...'}
                            </li>
                        );
                    })}
                </ul>
            </div>
            <button className='butt-order' onClick={placeOrder}>${total}<br/>Place order</button>
        </div>
    );
}

export default Cart;
