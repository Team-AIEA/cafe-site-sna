import { useState, useEffect } from 'react';

function Cart() {
    function getMoreInfo(itemId){
        // Fetch item details from the backend
        console.log(itemId);
        const [item, setItem] = useState();
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        fetch(`${API_BASE_URL}/api/items/${itemId}`, {
            method: 'GET',
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to fetch item details');
                }
                return response.json();
            })
            .then((data) => {
                console.log('Item details:', data);
                setItem(data);
                console.log("LOL");
            })
            .catch((error) => {
                console.error('Error:', error);
            });
            return item;
    }

    function hui(id) {
        return "sosi hui";
    }

    const [cart, setCart] = useState(() => {
        // Load cart from localStorage
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    const itemsDict = {};
    Object.entries(cart).map(([itemId, item]) => {
        itemsDict[itemId] = {
            id: itemId,
            name: getMoreInfo(itemId).name,
            price: getMoreInfo(itemId).price,
        }
    })

    console.log(itemsDict);
    return (
        <div>
            <a href="/"><img className='butt-up' src='../src/assets/back.png'></img></a>
            <h1>Cart</h1>
            <div className="cart-items">
            <ul>
                {/* {Object.entries(cart).map(([itemId, item]) => (
                    // <p>{hui(itemId)}</p>
                    // <p key={itemId}>{getMoreInfo(itemId)["name"]} - {getMoreInfo(itemId)["name"]} – {getMoreInfo(itemId)["price"]} – ×1 – $100{itemId}</p>

                    ))} */}
            </ul>
            </div>
        </div>
    );
}

export default Cart;