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
    cont.classList.add("order", "row", "shadow");
    let img=document.createElement("img");
    img.dataset.src=order.thumbnail;
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
    priceSingle.innerHTML=`Prezzo unitario ${parseFloat(prodotto.price).toLocaleString("it-IT", { style: 'currency', currency: 'EUR'})}`;

    let priceTot=document.createElement("div");
    priceTot.classList.add("priceTot");
    priceTot.innerHTML=`Totale ${parseFloat(prodotto.price * prodotto.quantity).toLocaleString("it-IT", { style: 'currency', currency: 'EUR'})}`;

    let artisan=document.createElement("a");
    artisan.href=prodotto.artisan.link;
    artisan.classList.add("artisan");
    let imgArtisan=document.createElement("img");
    imgArtisan.dataset.src=prodotto.artisan.photoProfile;
    imgArtisan.classList.add("lazyImages", "artisanImg");
    loadImage(imgArtisan);
    artisan.appendChild(imgArtisan);
    let nameArtisan=document.createElement("div");
    nameArtisan.classList.add("nameArtisan");
    nameArtisan.innerHTML=`${prodotto.artisan.name} ${prodotto.artisan.surname}`;
    artisan.appendChild(nameArtisan);

    let col1=document.createElement("div");
    col1.classList.add("col-md-4");
    col1.appendChild(img);
    
    let col2=document.createElement("div");
    col2.classList.add("col-md-6", "my-2","my-lg-0");
    col2.appendChild(name);
    col2.appendChild(quantity);
    col2.appendChild(priceSingle);
    col2.appendChild(priceTot);
    col2.appendChild(artisan);

    cont.appendChild(col1);
    cont.appendChild(col2);
    return cont;
}

let mockedProducts=[
    {
        id: 1,
        name: "Maglietta",
        quantity: 2,
        price: 25.00,
        thumbnail: "https://via.placeholder.com/150",
        artisan: {
            name: "Mario",
            surname: "Rossi",
            photoProfile: "https://via.placeholder.com/50",
            link: "/artigiani/mario-rossi"
        }
    },
    {
        id: 2,
        name: "Pantalone",
        quantity: 1,
        price: 50.00,
        thumbnail: "https://via.placeholder.com/150",
        artisan: {
            name: "Luigi",
            surname: "Verdi",
            photoProfile: "https://via.placeholder.com/50",
            link: "/artigiani/luigi-verdi"
        }
    },
    {
        id: 3,
        name: "Scarpe",
        quantity: 1,
        price: 100.00,
        thumbnail: "https://via.placeholder.com/150",
        artisan: {
            name: "Giuseppe",
            surname: "Bianchi",
            photoProfile: "https://via.placeholder.com/50",
            link: "/artigiani/giuseppe-bianchi"
        }
    }
]

const mokedOrder={
    id:1,
    timestamp:`${new Date().getDate()}/${new Date().getMonth()+1}/${new Date().getFullYear()} ${new Date().getHours()}:${new Date().getMinutes()}`,
}
const loadOrderProducts=async()=>{
    try{
        //sostitutire con chiamata api backend
        let listProduct=document.getElementById("listProducts");
        listProduct.innerHTML="";
        let totale=0;
        let contProdotti=0;
        mockedProducts.forEach((prodotto)=>{
            listProduct.appendChild(makeDivProdotto(prodotto));
            totale+=prodotto.price*prodotto.quantity;
            contProdotti+=prodotto.quantity;
        });

        document.getElementById("orderTotale").innerHTML=parseFloat(totale).toLocaleString("it-IT", { style: 'currency', currency: 'EUR' });
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
        const order=mokedOrder;
        loadOrderProducts();
        document.getElementById("orderTimestamp").innerHTML=order.timestamp;
        document.getElementById("orderTimestamp").classList.remove("placeholder-glow")
        
    }catch(err){
        console.error(err);
    }
}
const loadOrders=async(preview=false)=>{
    let cont=document.createElement("div");
    cont.classList.add("listOrders");
    let urlRequest=`https://localhost:4000/orders`;
    let response=mockOrders;
    console.log(response);
    if(preview){
        urlRequest+="/preview";
        response.length=3;
    }
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