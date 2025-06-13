import {loadImage} from "/src/js/modules/loadImageModule.js";
import {ajax} from "/src/js/modules/fetchWorkerModule.js";


const mockOrders = [
    {
        id: 1,
        total: 49.99,
        listProducts: "Maglietta, Pantaloni, Calzini",
        status: "Pagato",
        timestamp: "15/07/2024 10:30",
        thumbnail: "https://via.placeholder.com/150"
    },
    {
        id: 2,
        total: 99.50,
        listProducts: "Scarpe, Giacca",
        status: "Spedito",
        timestamp: "10/07/2024 15:45",
        thumbnail: "https://via.placeholder.com/150"
    },
    {
        id: 3,
        total: 25.00,
        listProducts: "Cappello, Guanti",
        status: "In preparazione",
        timestamp: "05/07/2024 09:00",
        thumbnail: "https://via.placeholder.com/150"
    },
    {
        id: 4,
        total: 120.00,
        listProducts: "Jeans, Camicia, Cintura",
        status: "Pagato",
        timestamp: "20/07/2024 14:20",
        thumbnail: "https://via.placeholder.com/150"
    },
    {
        id: 5,
        total: 65.50,
        listProducts: "Felpa, Pantaloni sportivi",
        status: "Spedito",
        timestamp: "18/07/2024 11:15",
        thumbnail: "https://via.placeholder.com/150"
    },
    {
        id: 6,
        total: 30.00,
        listProducts: "Sciarpa, Berretto",
        status: "In preparazione",
        timestamp: "12/07/2024 16:50",
        thumbnail: "https://via.placeholder.com/150"
    },
    {
        id: 7,
        total: 75.00,
        listProducts: "Polo, Pantaloncini",
        status: "Pagato",
        timestamp: "22/07/2024 08:40",
        thumbnail: "https://via.placeholder.com/150"
    },
    {
        id: 8,
        total: 150.00,
        listProducts: "Abito, Scarpe eleganti",
        status: "Spedito",
        timestamp: "16/07/2024 12:30",
        thumbnail: "https://via.placeholder.com/150"
    },
    {
        id: 9,
        total: 40.00,
        listProducts: "T-shirt, Calze",
        status: "In preparazione",
        timestamp: "08/07/2024 17:00",
        thumbnail: "https://via.placeholder.com/150"
    },
    {
        id: 10,
        total: 80.00,
        listProducts: "Giacca a vento, Guanti",
        status: "Pagato",
        timestamp: "25/07/2024 09:15",
        thumbnail: "https://via.placeholder.com/150"
    }
];

const makeDivOrder=(order)=>{
    let cont=document.createElement("div");
    cont.classList.add("order", "row");
    let img=document.createElement("img");
    img.dataset.src=order.thumbnail;
    img.classList.add("lazyImages", "orderImg");
    loadImage(img);
    
    let resumeOrder=document.createElement("div");
    resumeOrder.classList.add("resumeOrder");
    resumeOrder.innerHTML=`Ordine del ${order.timestamp}`;

    let pTot=document.createElement("div");
    pTot.innerHTML=`Totale ${order.total}`;
    pTot.classList.add("totalOrder");
    let listProduct=document.createElement("div");
    listProduct.classList.add("listProduct", "text-truncate");
    listProduct.innerHTML=`Contiene ${order.listProducts}`;

    let pillStatus=document.createElement("div");
    pillStatus.classList.add("pillStatus", order.status.toLowerCase().replaceAll(" ", "-"));
    pillStatus.innerHTML=`${order.status}`;

    let btnDetailOrder=document.createElement("a");
    btnDetailOrder.href="/clienti/area-riservata/"+order.id;
    btnDetailOrder.classList.add("btnDetailOrder");
    btnDetailOrder.innerHTML=`Vai all'ordine`;

    let col1=document.createElement("div");
    col1.classList.add("col-md-4");
    col1.appendChild(img);
    let col2=document.createElement("div");
    col2.classList.add("col-md-6");
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

const loadOrders=async(preview=false)=>{
    let cont=document.createElement("div");
    cont.classList.add("listOrders");
    let urlRequest=`https://localhost:4000/orders`;
    let response=mockOrders;
    if(preview)
        urlRequest+="/preview";
        response.length=3;
    try{
        //const request=await ajax(urlRequest);
        response.forEach((order)=>{
            cont.appendChild(makeDivOrder(order));
        });
        return cont;
    }catch(err){
        console.error(err);
        return null;
    }

}   


const handlePageHome=async()=>{
    let divOrders=await loadOrders(true);
    document.getElementById("previewOrders").innerHTML=divOrders.innerHTML;
}

const handlePageOrders=async()=>{
    let divOrders=loadOrders(false);
}
const handlePageOrder=(idOrder)=>{

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