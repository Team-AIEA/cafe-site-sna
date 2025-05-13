import React from "react";
import "./MenuItem.css";

const EditableMenuItem = ({id, name, price, img, val, description, available}) => {
    function nameChange(id, newName) {
        console.log("Name changed for item " + id + " to " + newName);
    }
    function descriptionChange(id, newDescription) {
        console.log("Description changed for item " + id + " to " + newDescription);
    }
    function setAvailable(available) {
        console.log("Availability changed to " + available);
        
    }
    function onPriceChange(id, newPrice) {
        console.log("Price changed for item " + id + " to " + newPrice);
        val = newPrice;
        console.log("New price is " + val);
    }

        return (
            <div className="menu-item">
                <img src={img} alt={name + " image"} className="menu-item-img"/>
                <input className="menu-item-name" value={name} onChange={(e) => nameChange(id, e.target.value)} />
                <input className="menu-item-description" value={description} onChange={(e) => descriptionChange(id, e.target.value)} />
                <input className="menu-item-availability" type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
                <input onChange={() => onPriceChange(id, price)} className="menu-item-price" value={`$${price}`} />
            </div>
        )
}

export default EditableMenuItem;