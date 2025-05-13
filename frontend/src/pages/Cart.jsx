import { useState, useEffect } from 'react';

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

    return (
        <div>
            <a href="/"><img className='butt-up' src='../src/assets/back.png' /></a>
            <h1>Cart</h1>
            <div className="cart-items">
                <ul>
                    {Object.entries(cart).map(([itemId, item]) => {
                        const info = itemsInfo[itemId];
                        return (
                            <li key={itemId}>
                                {info ? `${info.name} – ${info.price}` : 'Loading...'}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

export default Cart;
