import {addToCart, updateCart, removeFromCart} from "/src/js/modules/cart.js";
import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";
import {initProductQuantitySelectors} from "/src/js/modules/productQuantitySelector.js";

async function toFakeCart(cart) {
    const new_cart = [];

    for(const item of cart) {
        const item_info = await (await fetch('https://localhost:3000/products/product/' + item.slug)).json();
        new_cart.push({
            quantity: item.quantity,
            product: {
                id: item_info.id,
                name: item_info.name,
                price: item_info.price,
                description: item_info.description,
                thumbnail: item_info.images[0].url
            }
        });
    }

    return new_cart;
}

const makeProdElement=(item)=>{
    let cont=document.createElement("div");
    cont.classList.add("row", "product", "shadow");
    cont.dataset.id=item.product.id;

    let imgCont=document.createElement("div");
    imgCont.classList.add("col-sm-4");
    let img=document.createElement("img");
    img.classList.add("lazyImages");
    img.src = item.product.thumbnail;
    imgCont.appendChild(img);

    let infoCont=document.createElement("div");
    infoCont.classList.add("col-sm-8");
    infoCont.innerHTML=`
    <div class='d-flex flex-lg-row flex-column gap-2 justify-content-between align-items-center'>
        <div>
            <div class='titleProd'>${item.product.name}</div>
            <div class='descProd text-muted'>${item.product.description}</div>
            <div class='priceProd'>${parseFloat(item.product.price).toLocaleString("it-IT", { style: 'currency', currency: 'EUR' })}</div>
        </div>
        <div class="d-flex flex-lg-column flex-row gap-2 justify-content-between align-items-center">
            <div class="customQuantitySelector">
                <button class="removeOne" title="Rimuovi uno" id='removeFor${item.product.id}'><i class="fa-solid fa-minus"></i></button>
                <input id='valueFor${item.product.id}' class="quantityShow" type="number" value="${item.quantity}" data-id="${item.product.id}" min="1">
                <button class="addOne" title="Aggiungi uno" id='addFor${item.product.id}'><i class="fa-solid fa-plus"></i></button>
            </div>
            <button  id='deleteFor${item.product.id}' class="removeProduct btn btn-outline-danger rounded-4" data-id="${item.product.id}"><i class="fa-solid fa-trash-can"></i><div>Rimuovi</div></button>
        </div>
    </div>
    `;
    cont.appendChild(imgCont);
    cont.appendChild(infoCont);
    return cont;
}

let localCart=[];

const updateTotale=()=>{
    let totale=0;
    let iva=0;
    //TODO: api per ottenere percentuale iva
    let percIva=22;
    
    let scorporo=100/(100+percIva);
    let totImponibile=0;
    localCart.forEach(product=>{
        let pIvInclusa=product.price*product.quantity;
        let pNoIva=pIvInclusa*scorporo;
        totImponibile+=pNoIva;
        totale+=pIvInclusa;
        iva+=pIvInclusa-pNoIva;
    });
    //TODO: api per calcolo spedizione
    let spedizione=totale>100?0:10;
    totale+=spedizione;
    let spedNoIva=spedizione*scorporo
    iva+=spedizione-spedNoIva;

    document.getElementById("imponibile").innerHTML=parseFloat(totImponibile).toLocaleString("it-IT", { style: 'currency', currency: 'EUR' });
    document.getElementById("iva").innerHTML=parseFloat(iva).toLocaleString("it-IT", { style: 'currency', currency: 'EUR' });
    document.getElementById("spedizione").innerHTML=parseFloat(spedizione).toLocaleString("it-IT", { style: 'currency', currency: 'EUR' });
    document.getElementById("totale").innerHTML=parseFloat(totale).toLocaleString("it-IT", { style: 'currency', currency: 'EUR' });
}

function gi(id) {
    return document.getElementById(id);
}

gi('buyNow').addEventListener('click', async () => {
    let res = await fetch('https://localhost:3000/purchases/purchase', {method: 'POST', credentials: 'include'});
    if(res.ok)
        location.href = 'https://localhost/clienti/area-riservata';
    else
        alert('Errore nell\'acquisto');
});

const loadCart=async()=>{
    const container=document.getElementById("productList");
    container.innerHTML="";
    let numProducts=0;
    const response=await toFakeCart(await ajax('https://localhost:3000/purchases/cart'));
    response.forEach(item=>{
        numProducts+=item.quantity;
        localCart.push({
            id:item.product.id,
            quantity:item.quantity,
            price:item.product.price
        });
        container.appendChild(makeProdElement(item));
        const item_id = item.product.id;
        gi('removeFor' + item_id).addEventListener('click', () => removeFromCart(item_id, 1));
        gi('addFor' + item_id).addEventListener('click', () => addToCart(item_id, 1));
        gi('deleteFor' + item_id).addEventListener('click', () => removeFromCart(item_id, gi('valueFor' + item_id).value));
    });
    updateTotale();
    document.getElementById("resumeNumProducts").innerHTML=`${numProducts} prodotti`;
    initProductQuantitySelectors();
    
    //init remove product btn
    document.querySelectorAll(".removeProduct").forEach(btn=>{
        btn.addEventListener("click",(e)=>{
            e.preventDefault();
            removeProduct(btn.dataset.id);
        });
    });

    //add event listener to change product quantity
    document.querySelectorAll(".quantityShow").forEach(input=>{
        observeInput(input);
    });
    
}

const observeInput=(input)=>{
    const id=input.dataset.id;
    const observer=new MutationObserver(()=>{
        updateQuantity(id, input.value);
    });
    observer.observe(input,{
        attributes:true,
        attributeFilter:["value"]
    });
}
const removeProduct=(id)=>{
    let products=document.querySelectorAll(".product");
    products.forEach(product=>{
        if(product.dataset.id==id){
            product.remove();
        }
    });
    localCart=localCart.filter(product=>product.id!=id);
    updateTotale();
    //api call to update cart
    removeFromCart(id);
}

const updateQuantity=(id, quantity)=>{
    localCart.forEach(product=>{
        if(product.id==id){
            product.quantity=quantity;
        }
    });
    updateTotale();
    //api call to update cart
    updateCart(id, quantity);
}

document.addEventListener("DOMContentLoaded",async()=>{
    loadCart();
});