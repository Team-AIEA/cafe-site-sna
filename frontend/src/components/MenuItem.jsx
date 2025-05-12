import React from "react";
import "./MenuItem.css";

const MenuItem = ({id, name, price, img, onAddToCart, val}) => {
    if (val > 1) {
        return (
            <div className="menu-item">
                <img src={img} alt={name + " image"} className="menu-item-img"/>
                <p className="menu-item-name">{name}</p>
                <button onClick={() => onAddToCart(id, -1)}>-</button>
                <button className="menu-item-price">{val}</button>
                <button onClick={() => onAddToCart(id, 1)}>+</button>
            </div>
        )
    } else if (val == 1){
        return (
            <div className="menu-item">
                <img src={img} alt={name + " image"} className="menu-item-img"/>
                <p className="menu-item-name">{name}</p>
                <button onClick={() => onAddToCart(id, -1)}>×</button>
                <button className="menu-item-price">{val}</button>
                <button onClick={() => onAddToCart(id, 1)}>+</button>
            </div>
        )
    } else {
        
        return (
            <div className="menu-item">
                <img src={img} alt={name + " image"} className="menu-item-img"/>
                <p className="menu-item-name">{name}</p>
                <button onClick={() => onAddToCart(id, 1)} className="menu-item-price">${price}</button>
            </div>
        )
    }
}

export default MenuItem;