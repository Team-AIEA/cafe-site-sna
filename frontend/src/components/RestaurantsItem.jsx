import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RestaurantsItem = () => {
    const [restaurants, setRestaurants] = useState(null);
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

        fetch(`${API_BASE_URL}/api/restaurants`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then((response) => {
                console.log("Response:", response);
                if (!response.ok) {
                    throw new Error('Failed to fetch restaurants');
                }
                return response.json();
            })
            .then((data) => {
                console.log("Fetched restaurants data:", data);
                setRestaurants(data);
            })
            .catch((error) => {
                console.error('Error:', error);
                console.log("Redirecting due to fetch error");
                navigate('/login', { replace: true });
            });
    }, [navigate]);

    if (!restaurants) {
        return <p>Loading restaurants...</p>; // Better UX than showing nothing
    }

    return (
        <>
            <h1>Restaurants</h1>
            <ul>
                {restaurants.map((restaurant) => (
                    <li key={restaurant.id}>
                        <strong>
                            Restaurant #{restaurant.id}: {restaurant.name} — {restaurant.address} — {restaurant.working_hours} — {restaurant.contact_info}
                        </strong>
                    </li>
                ))}
            </ul>
        </>
    );
}

export default RestaurantsItem;