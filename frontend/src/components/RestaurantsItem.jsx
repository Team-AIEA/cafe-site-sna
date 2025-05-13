import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EditableMenuItem from './EditableMenuItem';
import AddMenuItem from "./AddMenuItem";

const RestaurantsItem = () => {
    const [restaurants, setRestaurants] = useState(null);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
    const [editingRestaurantId, setEditingRestaurantId] = useState(null);
    const [newRestaurant, setNewRestaurant] = useState({
        name: '',
        address: '',
        working_hours: '',
        contact_info: '',
        description: '',
    });

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
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
            .then(response => {
                if (response.status === 401 || response.status === 403) {
                    navigate('/login', { replace: true });
                } else if (!response.ok) {
                    throw new Error('Failed to fetch restaurants');
                }
                return response.json();
            })
            .then(data => setRestaurants(data))
            .catch(() => navigate('/login', { replace: true }));
    }, [navigate]);

    const handleRestaurantClick = (id) => {
        setSelectedRestaurantId(selectedRestaurantId === id ? null : id);
    };

    const handleInputChange = (e, field, id = null) => {
        const value = e.target.value;
        if (id === null) {
            setNewRestaurant({ ...newRestaurant, [field]: value });
        } else {
            const updated = restaurants.map(r =>
                r.id === id ? { ...r, [field]: value } : r
            );
            setRestaurants(updated);
        }
    };

    const saveRestaurantChanges = async (restaurant) => {
        const token = localStorage.getItem('access_token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        const response = await fetch(`${API_BASE_URL}/api/restaurants/${restaurant.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(restaurant),
        });

        if (!response.ok) {
            alert("Failed to save changes");
            return;
        }

        setEditingRestaurantId(null);
    };

    const addRestaurant = async () => {
        const token = localStorage.getItem('access_token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        const response = await fetch(`${API_BASE_URL}/api/restaurants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(newRestaurant),
        });

        if (!response.ok) {
            alert("Failed to add restaurant");
            return;
        }

        const added = await response.json();
        setRestaurants([...restaurants, added]);
        setNewRestaurant({
            name: '',
            address: '',
            working_hours: '',
            contact_info: '',
            description: '',
        });
    };

    if (!restaurants) return <p>Loading restaurants...</p>;

    return (
        <>
            <h1>Restaurants</h1>
            <div className='nothing'></div>
            <ul className='rest-list'>
                {restaurants.map((restaurant) => (
                    <li className='cart-items' id='restaurants' key={restaurant.id}>
                        <strong className='rest-name'
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleRestaurantClick(restaurant.id)}
                        >
                            Restaurant #{restaurant.id}: {restaurant.name}
                        </strong>

                        {editingRestaurantId === restaurant.id ? (
                            <div>
                                <input
                                    type="text"
                                    value={restaurant.name}
                                    onChange={(e) => handleInputChange(e, 'name', restaurant.id)}
                                    placeholder="Name"
                                    className="menu-item-description"
                                />
                                <input
                                    type="text"
                                    value={restaurant.address}
                                    onChange={(e) => handleInputChange(e, 'address', restaurant.id)}
                                    placeholder="Address"
                                    className="menu-item-description"
                                />
                                <input
                                    type="text"
                                    value={restaurant.working_hours}
                                    onChange={(e) => handleInputChange(e, 'working_hours', restaurant.id)}
                                    placeholder="Working Hours"
                                    className="menu-item-description"
                                />
                                <input
                                    type="text"
                                    value={restaurant.contact_info}
                                    onChange={(e) => handleInputChange(e, 'contact_info', restaurant.id)}
                                    placeholder="Contact Info"
                                    className="menu-item-description"
                                />
                                <textarea
                                    value={restaurant.description}
                                    onChange={(e) => handleInputChange(e, 'description', restaurant.id)}
                                    placeholder="Description"
                                    className="menu-item-description"
                                />
                                <button className='butt-order' id='save' onClick={() => saveRestaurantChanges(restaurant)}>Save</button>
                            </div>
                        ) : (
                            <>
                                <p>{restaurant.address} — {restaurant.working_hours} — {restaurant.contact_info}</p>
                                <p>{restaurant.description}</p>
                                <button className='butt-order' onClick={() => setEditingRestaurantId(restaurant.id)}>Edit</button>
                            </>
                        )}

                        {selectedRestaurantId === restaurant.id && (
                            <>
                                <p><em>Menu:</em></p>
                                <ul id="items">
                                    <AddMenuItem
                                        restaurant_id={restaurant.id}
                                        onItemAdded={async (newItem) => {
                                            // Ensure that newItem is valid before updating state
                                            if (!newItem || !newItem.id) {
                                                console.error("New item does not have valid id or data");
                                                return;
                                            }

                                            // Update the restaurants state with the new item details
                                            setRestaurants(prev =>
                                                prev.map(r =>
                                                    r.id === restaurant.id
                                                        ? { ...r, items: [...(r.items || []), newItem] }
                                                        : r
                                                )
                                            );
                                        }}
                                    />

                                    {restaurant.items && restaurant.items.length > 0 ? (
                                        restaurant.items.map(item => (
                                            <EditableMenuItem
                                                key={item.id}
                                                id={item.id}
                                                name={item.name}
                                                price={item.price}
                                                img={item.src}
                                                onAddToCart={() => console.log("ops")}
                                                val={item.price}
                                                description={item.description}
                                                available={item.available}
                                            />
                                        ))
                                    ) : (
                                        <li><em>No items listed for this restaurant.</em></li>
                                    )}
                                </ul>
                            </>
                        )}
                    </li>
                ))}
            </ul>

            <h1>Add New Restaurant</h1>
            <div className="div-add">
                <input
                    type="text"
                    placeholder="Name"
                    value={newRestaurant.name}
                    onChange={(e) => handleInputChange(e, 'name')}
                    className="menu-item-description"
                />
                <input
                    type="text"
                    placeholder="Address"
                    value={newRestaurant.address}
                    onChange={(e) => handleInputChange(e, 'address')}
                    className="menu-item-description"
                />
                <input
                    type="text"
                    placeholder="Working Hours"
                    value={newRestaurant.working_hours}
                    onChange={(e) => handleInputChange(e, 'working_hours')}
                    className="menu-item-description"
                />
                <input
                    type="text"
                    placeholder="Contact Info"
                    value={newRestaurant.contact_info}
                    onChange={(e) => handleInputChange(e, 'contact_info')}
                    className="menu-item-description"
                />
                <textarea
                    placeholder="Description"
                    value={newRestaurant.description}
                    onChange={(e) => handleInputChange(e, 'description')}
                    className="menu-item-description"
                />
                <button className="butt-order" id="save" onClick={addRestaurant}>Add Restaurant</button>
            </div>
        </>
    );
};

export default RestaurantsItem;
