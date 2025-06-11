/**
 * @version 1.0
 * @author Fabio Compagnoni
 */

import {ajax} from "/src/js/fetchWorkerModule.js";
import {loadImage} from "/src/js/loadImageModule.js";
import {addToCart} from "/src/js/cart.js";
import {initProductQuantitySelectors} from "/src/js/modules/productQuantitySelector.js";



/*actions for custom product selectors*/
document.addEventListener("DOMContentLoaded",initProductQuantitySelectors);

/*add to cart listener*/
const initAddToCart=()=>{
    document.getElementById("addToCartBtn").addEventListener("click",(e)=>{
        e.preventDefault();
        let quantity=parseInt(document.querySelector(".customQuantitySelector input").value);
        addToCart(window.productId, quantity);;
    });
}

const loadProductInfo=async()=>{
    try{
        //loading product info from api

        initAddToCart();
    }catch(err){
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded",loadProductInfo);