import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";
import { handlePageUrl, showErrorPopup } from "./index.js";
export const showOrders=async()=>{
    let cont=document.getElementById("orderList");

    let ordersRequest=await ajax("https://localhost:3000/purchases/orders");
    if(ordersRequest.error!=null){
        let err="Si è verificato un errore durante il caricamento dei tuoi ordini";
        if(ordersRequest.error.message=="Unauthorized")
            err="Per visualizzare gli ordini devi essere autenticato!";
        cont.innerHTML=`${err}</td>`;
        return;
    }
    if(ordersRequest.length==0){
        cont.innerHTML=`Non hai ricevuto ancora nessun ordine. Ci dispiace 🥲`;
        return;
    }
    ordersRequest.forEach(order=>{
        let dataOrdine=new Date(order.timestamp).toLocaleDateString();

        let itm=document.createElement("div");
        itm.classList.add("order","d-flex","flex-column", "flex-gap");
        let r1=document.createElement("div");
        r1.classList.add("d-flex","flex-row","flex-wrap","gap-2","justify-content-between", "align-items-start");
        let c1=document.createElement("div");
        c1.classList.add("d-flex","flex-row","gap-2","align-items-stretch");
        c1.style.minWidth="80%";
        let img=document.createElement("img");
        img.classList.add("orderThumbnail","lazyImages");
        let txtInfo=document.createElement("div");
        txtInfo.classList.add("d-flex","flex-column","gap-1");
        txtInfo.innerHTML=`<div class='orderTitle'>Ordine #${order.id} del ${dataOrdine} di ${order.name} ${order.surname}</div>
        <div class='orderPrice'>${parseFloat(order.amount_paid).toLocaleString('it-IT', {style: 'currency', currency: 'EUR'})}</div>
        <div class='text-muted'>Contiene ${order.products.length} prodotti</div>`;
        c1.appendChild(img);
        c1.appendChild(txtInfo);
        r1.appendChild(c1);
        let c2=document.createElement("div");
        c2.classList.add("btnCont")
        let btn=document.createElement("button");
        btn.classList.add("btn","btn-secondary","rounded-4", "btnAction");
        btn.innerHTML="Dettagli dell'ordine";
        btn.addEventListener("click",(event)=>{
            event.preventDefault();
            window.history.pushState({}, '', "/artigiani/area-riservata/ordini/"+order.id);
            handlePageUrl({
                home: document.querySelector("#home"),
                ordini: document.querySelector("#orders"),
                ordine: document.querySelector("#order"),
                prodotti: document.querySelector("#products"),
                prodotto: document.querySelector("#product"),
                clienti: document.querySelector("#customers"),
                rimborsi: document.querySelector("#refounds")
            });
        });
        c2.appendChild(btn);
        r1.appendChild(c2);
        itm.appendChild(r1);

        let r2=document.createElement("div");
        r2.classList.add("d-flex","flex-row","align-items-center","justify-content-between","flex-wrap","gap-2");
        let c3=document.createElement("div");
        c3.classList.add("d-flex","flex-row","gap-1","flex-wrap","align-items-center","orderProducts");
        order.products.forEach(product=>{
            let prod=document.createElement("div");
            prod.classList.add("d-flex","flex-column","gap-1", "prodPreview");
            let imgProd=document.createElement("img");
            imgProd.classList.add("prodThumbnail","lazyImages");
            loadImage(imgProd);
            prod.appendChild(imgProd);
            let titleProd=document.createElement("div");
            titleProd.classList.add("prodTitle");
            titleProd.innerHTML=product.name;
            prod.appendChild(titleProd);
            c3.appendChild(prod);
            
        });
        let c4=document.createElement("div");
        c4.classList.add("pillStatus", order.status.toLowerCase().replaceAll(" ","-"));
        c4.innerHTML=order.status;
        r2.appendChild(c3);
        r2.appendChild(c4);
        itm.appendChild(r2);

        cont.appendChild(itm);
        
        loadImage(img);
        
    });
}

const showOrderProducts=(products)=>{
    let cont=document.getElementById("orderProducts");
    if(products.length==0){
        cont.innerHTML="Nessun prodotto ordinato in questo ordine";
        return;
    }
    products.forEach(product=>{
        let prod=document.createElement("div");
        prod.classList.add("product","shadow-sm");

        let img=document.createElement("img");
        img.classList.add("productThumbnail","lazyImages");
        //TODO: add dataset.src quando è finita l'api
        loadImage(img);

        let div=document.createElement("div");
        div.classList.add("productInfo", "d-flex","flex-column","gap-1");
        div.innerHTML=`
            <div class='titleProd'>${product.name}</div>
            <div class='quantity'>Quantità: ${product.quantity}</div>
            <div class='priceUnit'>Prezzo unitario <b>${parseFloat(product.single_product_price).toLocaleString('it-IT', {style: 'currency', currency: 'EUR'})}</b></div>
            <div class='priceTotal'>Prezzo totale <b>${parseFloat(product.single_product_price*product.quantity).toLocaleString('it-IT', {style: 'currency', currency: 'EUR'})}</b></div>
        `;
        prod.appendChild(img);
        prod.appendChild(div);
        cont.appendChild(prod);
    });
}

export const showOrder=async(idOrder)=>{
    //ottengo le informazioni dell'ordine
    const orderInfo=await ajax("https://localhost:3000/purchases/order/"+idOrder);
    if(orderInfo.error!=null){
        let err="Si è verificato un errore durante il caricamento dell'ordine";
        if(orderInfo.error.message=="Unauthorized")
            err="Per visualizzare l'ordine devi essere autenticato!";
        console.error(err);

        showErrorPopup(err, "/artigiani/area-riservata/ordini", "Torna agli ordini");
        return;
    }

    //mostro le informazioni
    //TODO: da aggiornare con api completa
    document.getElementById("acquirente").innerText=``;
    document.getElementById("indirizzoSpedizione").innerText=``;
    document.getElementById("dataOra").innerText=`${new Date(orderInfo.timestamp).toLocaleString()}`;
    //riempire gli stati con api e selezionare quello corrente
    
    //prodotti
    showOrderProducts(orderInfo.products);
}

const shipOrder=(idOrder, trackingCode)=>{

}
