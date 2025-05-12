import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Orders() {
    const [orders, setOrders] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        console.log("HI!!!! ")
        const token = localStorage.getItem('access_token');
        console.log(token)
        if (!token) {
            navigate('/login', { replace: true }); // Redirect to login if no token
            console.log('No token found, redirecting to login');
            return;
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        // Fetch user details from the backend
        fetch(`${API_BASE_URL}/api/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then((response) => {
                console.log(response)
                if (!response.ok) {
                    throw new Error('Failed to fetch orders');
                }
                return response.json();
            })
            .then((data) => {
                setOrders(data.orders);
            })  
            .catch((error) => {
                console.error('Error:', error);
                navigate('/login', { replace: true }); // Redirect to login if fetching orders fails
                console.log("redirect")
            });
    }, [navigate]);

    if (!orders) {
        return null; // Show nothing while fetching orders
    }

    return (
        <>
            <h1>Orders</h1>
            <ul>
                {orders.map((order) => (
                    <li key={order.id}>
                        Order #{order.id}: {order.status}
                    </li>
                ))}
            </ul>
        </>
    );
}

export default Orders;