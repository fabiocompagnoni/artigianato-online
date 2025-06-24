import {loadImage} from "/src/js/modules/loadImageModule.js";
import {ajax} from "/src/js/modules/fetchWorkerModule.js";

function toProductsMock(products) {
    let listProducts = '';
    for(let i = 0; i < products.length - 1; i++) {
        listProducts += products[i].name + ', ';
    }
    listProducts += products[products.length - 1].name;

    return listProducts;
}

function toMockOrdersFormat(orders) {
    return orders.map(order => ({
        id: order.id,
        total: order.amount_paid,
        listProducts: toProductsMock(order.products),
        status: order.status,
        timestamp: order.timestamp,
        thumbnail: order.products[0].thumbnail
    }));
}

const makeDivOrder=(order)=>{
    let cont=document.createElement("div");
    cont.classList.add("order", "row", "shadow");
    let img=document.createElement("img");
    img.src=order.thumbnail;
    img.classList.add("lazyImages", "orderImg");
    loadImage(img);
    
    let resumeOrder=document.createElement("div");
    resumeOrder.classList.add("resumeOrder");
    resumeOrder.innerHTML=`Ordine del ${order.timestamp}`;

    let pTot=document.createElement("div");
    pTot.innerHTML=`Totale ${parseFloat(order.total).toLocaleString("it-IT", { style: 'currency', currency: 'EUR' })}`;
    pTot.classList.add("totalOrder");
    let listProduct=document.createElement("div");
    listProduct.classList.add("listProduct", "text-truncate");
    listProduct.innerHTML=`Contiene ${order.listProducts}`;

    let pillStatus=document.createElement("div");
    pillStatus.classList.add("pillStatus", order.status.toLowerCase().replaceAll(" ", "-"));
    pillStatus.innerHTML=`${order.status}`;

    let btnDetailOrder=document.createElement("a");
    btnDetailOrder.href="/clienti/area-riservata/ordini/"+order.id;
    btnDetailOrder.classList.add("btnDetailOrder");
    btnDetailOrder.innerHTML=`Vai all'ordine`;

    let col1=document.createElement("div");
    col1.classList.add("col-md-4");
    col1.appendChild(img);
    let col2=document.createElement("div");
    col2.classList.add("col-md-6", "my-2","my-lg-0");
    col2.appendChild(resumeOrder);
    col2.appendChild(pTot);
    col2.appendChild(listProduct);
    col2.appendChild(pillStatus);

    let col3=document.createElement("div");
    col3.classList.add("col-md-2", "d-flex", "align-items-center","justify-content-center","gap-1");
    col3.appendChild(btnDetailOrder);

    cont.appendChild(col1);
    cont.appendChild(col2);
    cont.appendChild(col3);
    return cont;
}

const makeDivProdotto=(prodotto)=>{
    let cont=document.createElement("div");
    cont.classList.add("row", "product", "shadow");

    let img=document.createElement("img");
    img.dataset.src=prodotto.thumbnail;
    img.classList.add("lazyImages", "productImg");
    loadImage(img);
    
    let name=document.createElement("div");
    name.classList.add("productName");
    name.innerHTML=prodotto.name;
    let quantity=document.createElement("div");
    quantity.classList.add("quantity");
    quantity.innerHTML=`${prodotto.quantity} pezzi`;

    let priceSingle=document.createElement("div");
    priceSingle.classList.add("priceSingle");
    priceSingle.innerHTML=`Prezzo unitario ${parseFloat(prodotto.single_product_price / 100).toLocaleString("it-IT", { style: 'currency', currency: 'EUR'})}`;

    let priceTot=document.createElement("div");
    priceTot.classList.add("priceTot");
    priceTot.innerHTML=`Totale ${parseFloat(prodotto.single_product_price * prodotto.quantity / 100).toLocaleString("it-IT", { style: 'currency', currency: 'EUR'})}`;

    let col1=document.createElement("div");
    col1.classList.add("col-md-4");
    col1.appendChild(img);
    
    let col2=document.createElement("div");
    col2.classList.add("col-md-6", "my-2","my-lg-0");
    col2.appendChild(name);
    col2.appendChild(quantity);
    col2.appendChild(priceSingle);
    col2.appendChild(priceTot);

    cont.appendChild(col1);
    cont.appendChild(col2);
    return cont;
}


const loadOrderProducts=async()=>{
    try{
        //sostitutire con chiamata api backend
        let listProduct=document.getElementById("listProducts");
        listProduct.innerHTML="";
        let totale=0;
        let contProdotti=0;
        const id_order = window.location.pathname.split('ordini/')[1];
        const ajax_res = await ajax('https://localhost:3000/purchases/order/' + id_order);
        
        document.getElementById("orderTimestamp").innerText=`${new Date(ajax_res.timestamp).getDate()}/${new Date(ajax_res.timestamp).getMonth()+1}/${new Date(ajax_res.timestamp).getFullYear()} ${new Date(ajax_res.timestamp).getHours()}:${new Date(ajax_res.timestamp).getMinutes()}`;
        document.getElementById("orderTimestamp").classList.remove("placeholder-glow")
        
        const products = ajax_res.items;
        products.forEach((prodotto)=>{
            listProduct.appendChild(makeDivProdotto(prodotto));
            totale+=prodotto.single_product_price*prodotto.quantity;
            contProdotti+=prodotto.quantity;
        });

        document.getElementById("orderTotale").innerHTML=parseFloat(totale / 100).toLocaleString("it-IT", { style: 'currency', currency: 'EUR' });
        document.getElementById("orderTotale").classList.remove("placeholder-glow");
        document.getElementById("numProducts").innerHTML=`${contProdotti} prodotti`;
        document.getElementById("numProducts").classList.remove("placeholder-glow");
    }catch(err){
        console.error(err);
    }
}

const loadOrder=(idOrder)=>{
    //TODO: sostituire con API
    try{
        loadOrderProducts();
        
    }catch(err){
        console.error(err);
    }
}
const loadOrders=async(preview=false)=>{
    let cont=document.createElement("div");
    cont.classList.add("listOrders");
    let urlRequest=`https://localhost:3000/purchases/orders/1`;
    const ajax_response = await ajax(urlRequest);
    document.getElementById('numOrdini').innerText = ajax_response.num_orders;
    let response=toMockOrdersFormat(ajax_response.orders);
    if(preview){
        urlRequest+="/preview";
        response.length=3;
    }
    try{
        response.forEach((order)=>{
            cont.appendChild(makeDivOrder(order));
        });
        if(ajax_response.orders.length==0){
            cont.innerHTML=`<div class='product shadow'>Non hai ancora effettuato acquisti.</div>`
        }
        return cont;
    }catch(err){
        console.error(err);
        return null;
    }

}

document.getElementById('reportButton').addEventListener('click', async () => {
    const note = prompt('Indica qui il tuo problema');
    if(note !== null) {
        const id_order = window.location.pathname.split('ordini/')[1];
        const res = await fetch('https://localhost:3000/purchases/report/' + id_order, {
            method: 'POST',
            body: JSON.stringify({ note }),
            credentials: 'include',
            headers: {"Content-Type": "application/json; charset=utf-8"}
        });
        if(res.ok)
            alert('Segnalazione inviata');
        else
            alert('Errore nell\'invio della segnalazione');
    }
});


const handlePageHome=async()=>{
    let divOrders=await loadOrders(true);
    document.getElementById("previewOrders").innerHTML=divOrders.innerHTML;
}

const handlePageOrders=async()=>{
    let divOrders=await loadOrders(false);
    document.getElementById("previewOrdersAll").innerHTML=divOrders.innerHTML;

}
const handlePageOrder=(idOrder)=>{
    loadOrder(idOrder);
    //TODO: gestire segnalazione
    //TODO: gestire reso e spedizione
}
const handlePageProfile=()=>{

}
document.addEventListener("DOMContentLoaded",async()=>{
    const url = window.location.pathname;
    if (url === '/clienti/area-riservata') {
        handlePageHome();
    } else if (url.startsWith('/clienti/area-riservata/ordini/')) {
        handlePageOrder();
    } else if (url === '/clienti/area-riservata/ordini') {
        const parts = url.split('/');
        const orderId = parts[parts.length - 1];
        handlePageOrders(orderId);
    } else if (url === '/clienti/area-riservata/profilo') {
        handlePageProfile();
    } else {
        handlePageHome();
    }
});

const makeLogout=async()=>{
    let req=ajax("https://localhost:3000/users/logout","POST");
    if(req.error==null){
        window.location.href="/";
    }
}


document.querySelectorAll(".btnLogout").forEach(btn=>{
    btn.addEventListener("click",()=>{
        makeLogout();
    });
});