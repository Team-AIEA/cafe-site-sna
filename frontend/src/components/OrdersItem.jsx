import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Orders = () => {
    const STATUS_OPTIONS = [
    { value: 0, label: 'Pending' },
    { value: 1, label: 'In Progress' },
    { value: 2, label: 'Completed' },
    { value: 3, label: 'Cancelled' }
];

    const [orders, setOrders] = useState(null);
    const [statusUpdates, setStatusUpdates] = useState({});
    const navigate = useNavigate();
    const [selectedRestaurant, setSelectedRestaurant] = useState(''); // empty means "All"
    const [loadingOrders, setLoadingOrders] = useState({});
    const [updatedOrders, setUpdatedOrders] = useState({});

    useEffect(() => {
        const token = localStorage.getItem('access_token');

        if (!token) {
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
                if (response.status === 401 || response.status === 403) {
                    navigate('/login', { replace: true });
                } else if (!response.ok){
                    console.log("Response status:", response.status);
                    console.log("Response status text:", response.statusText);
                     throw new Error('Failed to fetch user details');
                }
                return response.json();
            })
            .then((data) => {
                setOrders(data.orders);
            })
            .catch((error) => {
                console.error('Error:', error);
                navigate('/login', { replace: true });
            });
    }, [navigate]);

    const handleStatusChange = (orderId, newStatus) => {
        setStatusUpdates(prev => ({ ...prev, [orderId]: newStatus }));
    };

    const updateStatus = async (orderId) => {
        const token = localStorage.getItem('access_token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const newStatus = statusUpdates[orderId];

        // Set loading
        setLoadingOrders(prev => ({ ...prev, [orderId]: true }));
        setUpdatedOrders(prev => ({ ...prev, [orderId]: false }));

        try {
            const response = await fetch(`${API_BASE_URL}/api/order/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) throw new Error('Update failed');

            const data = await response.json();
            console.log('Status updated:', data);

            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === orderId ? { ...order, status: newStatus } : order
                )
            );

            // Show "Updated!" for a few seconds
            setUpdatedOrders(prev => ({ ...prev, [orderId]: true }));
            setTimeout(() => {
                setUpdatedOrders(prev => ({ ...prev, [orderId]: false }));
            }, 2000);
        } catch (error) {
            console.error('Update error:', error);
            alert('Failed to update order');
        } finally {
            setLoadingOrders(prev => ({ ...prev, [orderId]: false }));
        }
    };


    if (!orders) {
        return <p>Loading orders...</p>;
    }

    return (
        <>
            <h1>Orders</h1>
            <div style={{ marginBottom: '1rem' }}>
                <label>
                    Filter by Restaurant:
                    <select className='filter' value={selectedRestaurant} onChange={(e) => setSelectedRestaurant(e.target.value)}>
                        <option value="">All Restaurants</option>
                        {orders && [...new Set(orders.map(order => order.restaurant_id))].map(id => (
                            <option key={id} value={id}>Restaurant #{id}</option>
                        ))}
                    </select>
                </label>
            </div>

            <ul className='menu-div'>
                {orders
                    .filter(order => selectedRestaurant === '' || order.restaurant_id === Number(selectedRestaurant))
                    .map((order) => (

                    <li key={order.id} className='cart-items' id='orders'>
                        <strong>
                            Order #{order.id}</strong><br/>{STATUS_OPTIONS[order.status]?.label || 'Unknown'} — Restaurant {order.restaurant_id} — Table {order.table_id} — Order Number {order.order_number} — {order.total_cost}$
                        
                        <br />  
                        <div className='items-list'>
                        {Array.isArray(order.items) ? (
                            order.items.map((item) => (
                                <div key={item.id}>
                                    {item.name} — ${item.price} × {item.quantity}
                                </div>
                            ))
                        ) : (
                            <div style={{ color: 'red' }}>
                                ⚠️ Items data missing or invalid.
                            </div>
                        )}
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <label>
                                
                                <select className='status-change'
                                    value={statusUpdates[order.id] || order.status}
                                    onChange={(e) => handleStatusChange(order.id, Number(e.target.value))}
                                    disabled={
                                        order.status === 2 || order.status === 3
                                    }
                                >
                                {STATUS_OPTIONS.map(({ value, label }) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}

                                </select>
                            </label>
                            <button className='butt-order' 
                                onClick={() => updateStatus(order.id)} 
                                style={{ marginLeft: '10px' }} 
                                disabled={
                                    loadingOrders[order.id] ||
                                    String(statusUpdates[order.id]) === String(order.status) ||
                                    order.status === 2 || order.status === 3
                                }
                            >
                                {loadingOrders[order.id]
                                    ? 'Updating...'
                                    : updatedOrders[order.id]
                                        ? '✅ Updated!'
                                        : 'Update'}
                            </button>


                        </div>
                    </li>
                ))}
            </ul>
        </>
    );
};

export default Orders;
