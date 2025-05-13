import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Orders from '../../components/OrdersItem';
import RestaurantsItem from '../../components/RestaurantsItem';
import './Admin.css';

function Main() {
    const [username, setUsername] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        console.log(token)
        if (!token) {
            navigate('/login', { replace: true }); // Redirect to login if no token
            console.log('No token found, redirecting to login');
            return;
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        // Fetch user details from the backend
        fetch(`${API_BASE_URL}/api/user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then((response) => {
                console.log(response);
                if (response.status === 401 || response.status === 403) {
                    navigate('/login', { replace: true });``
                } else if (!response.ok) {
                    console.log("Response status:", response.status);
                    console.log("Response status text:", response.statusText);
                     throw new Error('Failed to fetch user details');
                }
                return response.json();
            })
            .then((data) => {
                setUsername(data.username);
            })
            .catch((error) => {
                console.error('Error:', error);

                navigate('/login', { replace: true }); // Redirect to login if fetching user details fails
            });
    }, [navigate]);

    if (!username) {
        return null; // Show nothing while fetching user details
    }

    return (
        <>
            <h1>Hi {username}!</h1>
            <div className='columns-parent'><div className='col-orders'><Orders /></div>
            <div className='col-menu'><RestaurantsItem/></div>
            </div>
            
            
        </>
    );
}

export default Main;