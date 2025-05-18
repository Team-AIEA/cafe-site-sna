import { useEffect, useState } from 'react';
import { useNavigate, useParams} from 'react-router-dom';

function Order() {
    const navigate = useNavigate();

    function deleteOrderFromLocalStorage() {
        localStorage.removeItem('order_id');
        navigate(`/`);
    }

    const { id } = useParams(); // Get the order ID from the URL
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
    useEffect(() => {
        let order_id = id || localStorage.getItem('order_id');
        if (order_id !== null){
            localStorage.setItem('order_id', order_id);
            // Fetch order details from the backend
            fetch(`${API_BASE_URL}/api/order/${order_id}`, {
                method: 'GET',
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch order details');
                    }
                    return response.json();
                })
                .then((data) => {
                    setOrder(data);
                })
                .catch((error) => {
                    console.error('Error:', error);
                    setError('Failed to load order details. Please try again later.');
                });
            }
            else{
                setError('No order id is specified.');
            }
        
    }, [id]);
    const [restaurant, setRestaurant] = useState(null);
    // Fetch restaurant details based on the order's restaurant_id
    useEffect(() => {
        if (order?.restaurant_id === undefined || order?.restaurant_id === null) return;
        fetch(`${API_BASE_URL}/api/restaurants/${order.restaurant_id}`)
            .then(res => res.json())
            .then(setRestaurant)
            .catch(() => setRestaurant(null));
    }, [order]);
    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!order) {
        return <div>Loading...</div>;
    }
    console.log(order.status);
    return (
        <div className='cart-main'>
            <a href="/"><img className='butt-up' src='/back.png' /></a>
            <h1>Order Details</h1>
            <div className='cart-items'>
            <p><strong>Order ID:</strong> {order.id}</p>
            {/* <p><strong>Status:</strong> {order.status}</p> */}
            <p><strong>Table ID:</strong> {order.table_id}</p>
            {/* <p><strong>Order Number:</strong> {order.order_number}</p> */}
            {/* <p><strong>Restaurant ID:</strong> {order.restaurant_id}</p> */}
            <p><strong>Restaurant:</strong> {restaurant?.name || 'Loading...'} - {restaurant?.address || 'Loading...'} {restaurant?.working_hours || 'Loading...'} {restaurant?.description || 'Loading...'} {restaurant?.contact_info || 'Loading...'}</p>
            <h2>Items</h2>
            <ul className='items-list'>
                {Object.entries(order.items).map(([itemId, item]) => (
                    <li key={itemId}>
                        {item.name} — {item.quantity} x {item.price}$ = {item.price * item.quantity}$
                    </li>
                ))}

            </ul>
            
            {order.status == 0 ? (<div className='status-created'>Created</div>) : order.status == 1 ? (<div className='status-cooking'>Cooking</div>)
            : order.status == 2 ? (<><div className='status-done'>Done</div><button className='butt-new' onClick={deleteOrderFromLocalStorage}>New Order</button></>)
             : order.status == 3 ? (<><div className='status-cancelled'>Cancelled</div><button className='butt-new' onClick={deleteOrderFromLocalStorage}>New Order</button></>) : (<></>)}
             </div>
        </div>
    );
}

export default Order;
