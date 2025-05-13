import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EditableMenuItem from './EditableMenuItem';

const RestaurantsItem = () => {
    const [restaurants, setRestaurants] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
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
                    <li key={restaurant.id} style={{ marginBottom: '1.5rem' }}>
                        <strong>
                            Restaurant #{restaurant.id}: {restaurant.name} — {restaurant.address} — {restaurant.working_hours} — {restaurant.contact_info}
                        </strong>
                        <p>{restaurant.description}</p>

                        {restaurant.items && restaurant.items.length > 0 ? (
                            <>
                                <p><em>Menu:</em></p>
                                <ul>
                                    {restaurant.items.map((item) => (
                                        <EditableMenuItem
                                            key={item.id}
                                            id={item.id}
                                            name={item.name}
                                            price={item.price}
                                            img={item.img}
                                            onAddToCart={console.log("ops")}
                                            val={item.price}
                                            description={item.description}
                                            available={item.available}
                                        />
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p><em>No items listed for this restaurant.</em></p>
                        )}
                    </li>
                ))}
            </ul>
        </>
    );

}

export default RestaurantsItem;