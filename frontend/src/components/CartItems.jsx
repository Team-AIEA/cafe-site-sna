import React from "react";
import "./MenuItem.css";

const CartItems = ({cart}) => {
    console.log(cart);
    return (
        <div className="cart-items">
            <ul>
                {cart.map((item) => (
                        <p key={item.id}>{item.name} – ${item.price} – ×{cart[item.id]} – ${item.price * cart[item.id]}</p>
                    ))}
            </ul>
            
        </div>
    )
}

export default CartItems;