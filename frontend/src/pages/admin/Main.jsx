import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Orders from '../../components/OrdersItem';
import RestaurantsItem from '../../components/RestaurantsItem';
import './Admin.css';

function Main() {
    const [username, setUsername] = useState(null);
    const [newAdmin, setNewAdmin] = useState({
        username: '',
        password: '',
        restaurant_id: '',
        superuser: false,
    });
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();
    const [restaurants, setRestaurants] = useState([]);
    const [superuser, setSuperuser] = useState(false);
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        // Fetch user info
        fetch(`${API_BASE_URL}/api/user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then((response) => {
                if (response.status === 401 || response.status === 403) {
                    navigate('/login', { replace: true });
                } else if (!response.ok) {
                    throw new Error('Failed to fetch user details');
                }
                return response.json();
            })
            .then((data) => {
                setUsername(data.username);
                setSuperuser(data.superuser);
            })
            .catch((error) => {
                console.error('Error:', error);
                navigate('/login', { replace: true });
            });

        // Fetch restaurants
        fetch(`${API_BASE_URL}/api/restaurants`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(res => res.json())
            .then(data => setRestaurants(data))
            .catch(err => console.error('Failed to fetch restaurants:', err));

    }, [navigate]);


    const handleLogout = () => {
        const token = localStorage.getItem('access_token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        fetch(`${API_BASE_URL}/api/logout`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(() => {
            localStorage.removeItem('access_token');
            navigate('/login', { replace: true });
        })
        .catch((error) => {
            console.error('Logout failed:', error);
            localStorage.removeItem('access_token');
            navigate('/login', { replace: true });
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewAdmin({ ...newAdmin, [name]: value });
    };

    const handleCreateAdmin = (e) => {
        e.preventDefault();

        const token = localStorage.getItem('access_token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        fetch(`${API_BASE_URL}/api/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                username: newAdmin.username,
                password: newAdmin.password,
                restaurant_id: parseInt(newAdmin.restaurant_id),
                superuser: newAdmin.superuser,
            }),
        })
        .then((res) => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (status === 201) {
                setMessage("✅ Admin created successfully!");
                setNewAdmin({ username: '', password: '', restaurant_id: '', superuser: false });
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        })
        .catch((err) => {
            console.error(err);
            setMessage("❌ Network error during admin creation");
        });
    };

    if (!username) return null;

    return (
        <>
            <div className="header">
                <h1>Hi {username}! {superuser && '👑'}</h1>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>

            <div className="columns-parent">
                <div className="col-orders">
                    <Orders />
                </div>
                <div className="col-menu">
                    <RestaurantsItem />
                </div>
            </div>

            {superuser && (
                <div className="admin-form">
                    <h2>Create New Admin</h2>
                    <form onSubmit={handleCreateAdmin}>
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={newAdmin.username}
                            onChange={handleInputChange}
                            required
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={newAdmin.password}
                            onChange={handleInputChange}
                            required
                        />
                        <select
                            name="restaurant_id"
                            value={newAdmin.restaurant_id}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select a Restaurant</option>
                            {restaurants.map((restaurant) => (
                                <option key={restaurant.id} value={restaurant.id}>
                                    {restaurant.name ? restaurant.name : `Restaurant #${restaurant.id}`}
                                </option>
                            ))}
                        </select>

                        <label>
                            <input
                                type="checkbox"
                                name="superuser"
                                checked={newAdmin.superuser || false}
                                onChange={(e) =>
                                    setNewAdmin({ ...newAdmin, superuser: e.target.checked })
                                }
                            />
                            Superuser
                        </label>

                        <button type="submit">Add Admin</button>
                    </form>
                    {message && <p className="status-msg">{message}</p>}
                </div>
            )}

        </>
    );
}

export default Main;
