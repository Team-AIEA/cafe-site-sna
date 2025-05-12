import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function Order() {
    const { id } = useParams(); // Get the order ID from the URL
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        // Fetch order details from the backend
        fetch(`${API_BASE_URL}/api/order/${id}`, {
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
    }, [id]);

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!order) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Order Details</h1>
            <p><strong>Order ID:</strong> {order.id}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Table ID:</strong> {order.table_id}</p>
            <p><strong>Order Number:</strong> {order.order_number}</p>
            <p><strong>Restaurant ID:</strong> {order.restaurant_id}</p>
            <h2>Items</h2>
            <ul>
                {Object.entries(order.items).map(([itemId, quantity]) => (
                    <li key={itemId}>Item ID: {itemId}, Quantity: {quantity}</li>
                ))}
            </ul>
        </div>
    );
}

export default Order;