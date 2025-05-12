import { useState, useEffect } from 'react';
import CartItems from '../components/CartItems';

function Cart() {
    return (
        <div>
            <a href="/"><img className='butt-up' src='../src/assets/back.png'></img></a>
            <h1>Cart</h1>
            <CartItems cart={localStorage.getItem('cart')}/>
        </div>
    );
}

export default Cart;