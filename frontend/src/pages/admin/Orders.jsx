import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Orders() {
    const [orders, setOrders] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        console.log("HI!!!! ");
        const token = localStorage.getItem('access_token');
        console.log("Token:", token);
        
        if (!token) {
            console.log('No token found, redirecting to login');
            navigate('/login', { replace: true });
            return;
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        fetch(`${API_BASE_URL}/api/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then((response) => {
                console.log("Response:", response);
                if (!response.ok) {
                    throw new Error('Failed to fetch orders');
                }
                return response.json();
            })
            .then((data) => {
                console.log("Fetched orders data:", data);
                setOrders(data.orders);
            })
            .catch((error) => {
                console.error('Error:', error);
                console.log("Redirecting due to fetch error");
                navigate('/login', { replace: true });
            });
    }, [navigate]);

    if (!orders) {
        return <p>Loading orders...</p>; // Better UX than showing nothing
    }

    return (
        <>
            <h1>Orders</h1>
            <ul>
                {orders.map((order) => (
                    <li key={order.id}>
                        <strong>
                            Order #{order.id}: {order.status} — Table {order.table_id} — Order Number {order.order_number}
                        </strong>
                        <br />
                        {Array.isArray(order.items) ? (
                            order.items.map((item) => (
                                <div key={item.id}>
                                    Item #{item.id}: {item.name} — ${item.price} × {item.quantity}
                                </div>
                            ))
                        ) : (
                            <div style={{ color: 'red' }}>
                                ⚠️ Items data missing or invalid.
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </>
    );
}

export default Orders;
