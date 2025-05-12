import React from "react";
import "./MenuItem.css";

const MenuItem = ({id, name, price, img, onAddToCart, value}) => {

    return (
        <div className="menu-item">
            <img src={img} alt={name + " image"} className="menu-item-img"/>
            <p className="menu-item-name">{name}</p>
            <a>{value}</a>
            <button onClick={() => onAddToCart(id)} className="menu-item-price">${price}</button>
        </div>
    )
}

export default MenuItem;