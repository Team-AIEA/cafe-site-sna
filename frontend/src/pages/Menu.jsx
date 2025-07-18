import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuItem from '../components/MenuItem.jsx'

function Menu() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const [table_id, setTable] = useState(queryParams.get('table'));
    const [restaurant_id, setRestaurant] = useState(queryParams.get('restaurant'));
    const [displaySign, setDisplaySign] = useState(false);
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
    
    useEffect(() => {
        if (table_id) {
            localStorage.setItem('table_id', table_id);
        }
        else {
            setTable(localStorage.getItem('table_id'));
        }
        if (restaurant_id) {
            localStorage.setItem('restaurant_id', restaurant_id);
        }
        else {
            setRestaurant(localStorage.getItem('restaurant_id'));
        }

  }, [table_id, restaurant_id]);

    function addToCart(itemId, inc){
        const updatedCart = { ...cart };
        updatedCart[itemId] = (updatedCart[itemId] || 0) + inc; // Increment quantity
        if (updatedCart[itemId] <= 0) {
            delete updatedCart[itemId];
        }
        setCart(updatedCart);
        console.log("Set cart")
        localStorage.setItem('cart', JSON.stringify(updatedCart)); // Save cart to localStorage
    }
    
    function getItems(itemId){
        return  cart[itemId];
    }
    
    useEffect(() => {
        if (Object.keys(cart).length > 0) {
            setDisplaySign(true);
        } else {
            if (localStorage.getItem('order_id')) {
                setDisplaySign(true);
            }
            else {
                setDisplaySign(false);
            }
        }

    }, [cart]);
    return (
        <div>
            {localStorage.getItem('order_id') ? (<a href={`/order/${localStorage.getItem('order_id')}`}><img className='butt-down' src='/order.png'></img></a>)
             : displaySign ? (<a href="/cart"><img className='butt-down' src='/cart.png'></img></a>) : null}
        <h1>Food & Drinks</h1>
        <div className='menu-div'>         
                {items.map((item) => (
                    <MenuItem id={item.id} name={item.name} price={item.price} onAddToCart={addToCart} img={item.src} val={getItems(item.id)}/>
                ))}
        </div>
        </div>
    );
}

export default Menu;
