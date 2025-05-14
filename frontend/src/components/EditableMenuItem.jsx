import React, { useState } from "react";
import "./MenuItem.css";

const EditableMenuItem = ({ id, name, price, img, description, available, editable }) => {
    const [localName, setLocalName] = useState(name);
    const [localDescription, setLocalDescription] = useState(description);
    const [localPrice, setLocalPrice] = useState(price);
    const [localAvailable, setLocalAvailable] = useState(available);
    const updateBackend = async (data) => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            const token = localStorage.getItem('access_token');
            console.log(token)
            const res = await fetch(`${API_BASE_URL}/api/items/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                console.error("Update failed:", error);
            }
        } catch (err) {
            console.error("Network error:", err);
        }
    };

    const onNameChange = (e) => {
        if (!editable) return;
        const newName = e.target.value;
        setLocalName(newName);
        updateBackend({ name: newName });
    };

    const onDescriptionChange = (e) => {
        if (!editable) return;
        const newDescription = e.target.value;
        setLocalDescription(newDescription);
        updateBackend({ description: newDescription });
    };

    const onAvailabilityChange = (e) => {
        if (!editable) return;
        const newAvailable = e.target.checked;
        setLocalAvailable(newAvailable);
        updateBackend({ available: newAvailable });
    };

    const onPriceChange = (e) => {
        if (!editable) return;
        const newPrice = parseFloat(e.target.value);
        if (!isNaN(newPrice)) {
            setLocalPrice(newPrice);
            updateBackend({ price: newPrice });
        }
    };
    console.log("EditableMenuItem rendered with props:", { id, name, price, img, description, available });
    return (
        <div className="menu-item" id="edit">
            <img src={img} alt={`${localName} image`} className="menu-item-img" />
            <input
                className="menu-item-name"
                id="edit"
                value={localName}
                onChange={onNameChange}
                readOnly={!editable}
            />
            <input
                className="menu-item-description"
                value={localDescription}
                onChange={onDescriptionChange}
                readOnly={!editable}
            />
            <input
                className="menu-item-availability"
                type="checkbox"
                checked={localAvailable}
                onChange={onAvailabilityChange}
                readOnly={!editable}
            />
            <input
                className="menu-item-description"
                value={localPrice}
                onChange={onPriceChange}
                type="number"
                step="0.01"
                readOnly={!editable}
            />
        </div>
    );
};

export default EditableMenuItem;
