import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";

export const showOrders=async()=>{
    let cont=document.getElementById("orderList");

    /*let ordersRequest=await ajax("https://localhost:3000/purchases/orders");
    if(ordersRequest.error!=null){
        let err="Si è verificato un errore durante il caricamento dei tuoi ordini";
        if(ordersRequest.error.message=="Unauthorized")
            err="Per visualizzare gli ordini devi essere autenticato!";
        cont.innerHTML=`${err}</td>`;
        return;
    }*/
    let mockOrders = [
        {
            id: 1,
            timestamp: Date.now() - 86400000,
            name: "Mario",
            surname: "Rossi",
            amount_paid: 49.99,
            status: "Pagato",
            products: [
                { id: 101, name: "Vaso", image: "/img/vaso.jpg" },
                { id: 102, name: "Tazza", image: "/img/tazza.jpg" }
            ]
        },
        {
            id: 2,
            timestamp: Date.now() - 172800000,
            name: "Luca",
            surname: "Bianchi",
            amount_paid: 89.50,
            status: "Spedito",
            products: [
                { id: 103, name: "Piatto", image: "/img/piatto.jpg" }
            ]
        },
        {
            id: 3,
            timestamp: Date.now() - 259200000,
            name: "Giulia",
            surname: "Verdi",
            amount_paid: 120.00,
            status: "Consegnato",
            products: [
                { id: 104, name: "Lampada", image: "/img/lampada.jpg" },
                { id: 105, name: "Ciotola", image: "/img/ciotola.jpg" },
                { id: 106, name: "Brocca", image: "/img/brocca.jpg" }
            ]
        },
        {
            id: 4,
            timestamp: Date.now() - 345600000,
            name: "Sara",
            surname: "Neri",
            amount_paid: 35.75,
            status: "Annullato",
            products: [
                { id: 107, name: "Portacandele", image: "/img/portacandele.jpg" }
            ]
        },
        {
            id: 5,
            timestamp: Date.now() - 432000000,
            name: "Alessandro",
            surname: "Russo",
            amount_paid: 75.20,
            status: "Rimborsato",
            products: [
                { id: 108, name: "Bicchiere", image: "/img/bicchiere.jpg" },
                { id: 109, name: "Piatto fondo", image: "/img/piatto_fondo.jpg" }
            ]
        }
    ];
    // Per test: sostituisci ordersRequest con mockOrders
    let ordersRequest = mockOrders;
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
        
    })
}
