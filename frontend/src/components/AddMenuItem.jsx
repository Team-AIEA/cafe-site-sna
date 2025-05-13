import React, { useState } from "react";
import "./MenuItem.css";

const AddMenuItem = ({ restaurant_id, onItemAdded }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [src, setSrc] = useState("");
    const [available, setAvailable] = useState(true);

const handleAdd = async () => {
    const token = localStorage.getItem("access_token");
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    
    const itemData = {
        name,
        description,
        price: parseFloat(price),
        available,
        src,
        restaurant_id,
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(itemData),
        });

        const result = await res.json();

        if (!res.ok) {
            console.error("Error creating item:", result.error || result.detail);
            return;
        }

        // Fetch the full item data using the ID from the POST response
        const itemRes = await fetch(`${API_BASE_URL}/api/items/${result.id}`, {
            method: "GET",
        });

        const item = await itemRes.json();

        if (!itemRes.ok) {
            console.error("Error fetching item details:", item.error || item.detail);
            return;
        }

        // Pass the full item object to the parent component
        if (onItemAdded) onItemAdded(item);  // Pass the whole item object

        // Reset form
        setName("");
        setDescription("");
        setPrice("");
        setAvailable(true);
        setSrc("");
    } catch (err) {
        console.error("Network error:", err);
    }
};


    return (
        <div className="menu-item" id="edit">
            <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="menu-item-name"
                id="edit"
            />
            <input
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="menu-item-description"
            />
            <input
                placeholder="Image"
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                className="menu-item-description"
            />
            <input
                placeholder="Price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="menu-item-description"
                id="edit"
            />
            <label>
                Available
                <input
                    type="checkbox"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    className="menu-item-availability"
                />
                {/* Available */}
            </label><br/>
            <button className="butt-order" onClick={handleAdd}>Add Item</button>
        </div>
    );
};

export default AddMenuItem;
