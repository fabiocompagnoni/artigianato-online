/**
 * @version 1.0
 * @author Fabio Compagnoni
 */

import {loadImage} from "/src/js/loadImageModule.js";
import {ajax} from "/src/js/fetchWorkerModule.js";
let filter={};
let orderBy={};

const loadProducts=async()=>{
    const containerProducts=document.getElementById("productList");
    try{
        let request=await ajax("https://localhost:4002/products","GET");
        let products=await request.json();

    }catch(err){
        console.error(err);
    }
}



document.addEventListener("DOMContentLoaded",()=>{
    loadProducts();
});