import React from "react";
import "./MenuItem.css";

const MenuItem = ({id, name, price, img, onAddToCart}) => {

    return (
        <div className="menu-item">
            <img source={img} alt={name + " image"} className="menu-item-img"/>
            <p className="menu-item-name">{name}</p>
            <button onClick={() => onAddToCart(id)} className="menu-item-price">${price}</button>
        </div>
    )
}

export default MenuItem;