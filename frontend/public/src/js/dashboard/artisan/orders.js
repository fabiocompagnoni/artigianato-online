import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";

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
    ordersRequest.forEach(order=>{
        let dataOrdine=new Date(order.timestamp).toLocaleDateString();

        let itm=document.createElement("div");
        itm.classList.add("order","d-flex","flex-column", "flex-gap");
        let r1=document.createElement("div");
        r1.classList.add("d-flex","flex-row","flex-wrap","gap-2","justify-content-between", "align-items-start");
        let c1=document.createElement("div");
        c1.classList.add("d-flex","flex-row","gap-2","align-items-stretch");
        let img=document.createElement("img");
        img.classList.add("orderThumbnail","lazyImages");
        let txtInfo=document.createElement("div");
        txtInfo.classList.add("d-flex","flex-column","gap-1");
        txtInfo.innerHTML=`<div class='orderTitle'>Ordine #${order.id} del ${dataOrdine} di ${order.name} ${order.surname}</div>
        <div class='orderPrice'>${parseFloat(order.amount_paid).toLocaleString('it-IT', {style: 'currency', currency: 'EUR'})}</div>
        <div class='text-muted'>Contiene ${order_num_products} prodotti</div>`;
        c1.appendChild(img);
        c1.appendChild(txtInfo);
        r1.appendChild(c1);
        let c2=document.createElement("div");
        let btn=document.createElement("button");
        btn.classList.add("btn","btn-secondary","rounded-4");
        btn.innerHTML="Dettagli dell'ordine";
        c2.appendChild(btn);
        r1.appendChild(c2);
        itm.appendChild(r1);

        let r2=document.createElement("div");
        r2.classList.add("d-flex","flex-row","align-items-center","justify-content-between","flex-wrap","gap-2");
        let c3=document.createElement("div");
        c3.classList.add("d-flex","flex-row","gap-1","flex-wrap","align-items-center","orderProducts");
        order.products.forEach(product=>{
            //todo: fare sulla base dell'api da fare
        });
        let c4=document.createElement("div");
        c4.classList.add("pillStatus");
        c4.innerHTML=order.status;
        r2.appendChild(c3);
        r2.appendChild(c4);
        itm.appendChild(r2);

        cont.appendChild(itm);
        
        loadImage(img);
        
    })
}
