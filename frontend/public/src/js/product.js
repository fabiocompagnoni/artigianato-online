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