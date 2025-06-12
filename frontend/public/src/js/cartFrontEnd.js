import {addToCart, updateCart, removeFromCart} from "/src/js/modules/cart.js";
import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";
import {initProductQuantitySelectors} from "/src/js/modules/productQuantitySelector.js";

let fakeCart = [
    {
        product: {
            id: 101,
            name: "Vaso in Ceramica Dipinto a Mano - Motivi Floreali",
            link: "/prodotti/elena-rossi/vaso-ceramica-dipinto-a-mano-motivi-floreali",
            thumbnail: "https://via.placeholder.com/150/f0f0f0/000000?Text=Vaso+Ceramica",
            description:
                "Elegante vaso in ceramica realizzato a mano con delicati motivi floreali. Perfetto per decorare la tua casa o come regalo speciale.",
            price: 35.0,
            categories: [
                {
                    name: "Ceramiche",
                    link: "/categorie/ceramiche",
                },
                {
                    name: "Decorazioni per la casa",
                    link: "/categorie/decorazioni-casa",
                },
            ],
            artisan: {
                name: "Elena",
                surname: "Rossi",
                photoProfile: "https://via.placeholder.com/50/808080/ffffff?Text=ER",
                link: "/artigiani/elena-rossi",
            },
        },
        quantity: Math.floor(Math.random() * 5) + 1,
    },
    {
        product: {
            id: 102,
            name: "Collana in Argento 925 con Pietra Ametista",
            link: "/prodotti/marco-bianchi/collana-argento-925-pietra-ametista",
            thumbnail: "https://via.placeholder.com/150/e0e0e0/000000?Text=Collana+Argento",
            description:
                "Raffinata collana in argento sterling 925 con una splendida pietra di ametista. Un gioiello unico per ogni occasione.",
            price: 55.0,
            categories: [
                {
                    name: "Gioielli",
                    link: "/categorie/gioielli",
                },
                {
                    name: "Collane",
                    link: "/categorie/collane",
                },
            ],
            artisan: {
                name: "Marco",
                surname: "Bianchi",
                photoProfile: "https://via.placeholder.com/50/707070/ffffff?Text=MB",
                link: "/artigiani/marco-bianchi",
            },
        },
        quantity: Math.floor(Math.random() * 5) + 1,
    },
    {
        product: {
            id: 103,
            name: "Tagliere in Legno d'Olivo Fatto a Mano",
            link: "/prodotti/giulia-verdi/tagliere-legno-olivo-fatto-a-mano",
            thumbnail: "https://via.placeholder.com/150/d0d0d0/000000?Text=Tagliere+Legno",
            description:
                "Tagliere unico in legno d'olivo massello, ideale per servire formaggi, salumi o come elemento decorativo in cucina.",
            price: 40.0,
            categories: [
                {
                    name: "Articoli per la cucina",
                    link: "/categorie/articoli-cucina",
                },
                {
                    name: "Legno",
                    link: "/categorie/legno",
                },
            ],
            artisan: {
                name: "Giulia",
                surname: "Verdi",
                photoProfile: "https://via.placeholder.com/50/606060/ffffff?Text=GV",
                link: "/artigiani/giulia-verdi",
            },
        },
        quantity: Math.floor(Math.random() * 5) + 1,
    },
    {
        product: {
            id: 104,
            name: "Sciarpa in Lana Merinos Lavorata a Maglia",
            link: "/prodotti/luca-neri/sciarpa-lana-merinos-lavorata-a-maglia",
            thumbnail: "https://via.placeholder.com/150/c0c0c0/000000?Text=Sciarpa+Lana",
            description:
                "Calda e morbida sciarpa in pura lana merinos, lavorata a mano con una delicata trama. Perfetta per le giornate fredde.",
            price: 60.0,
            categories: [
                {
                    name: "Accessori",
                    link: "/categorie/accessori",
                },
                {
                    name: "Abbigliamento",
                    link: "/categorie/abbigliamento",
                },
            ],
            artisan: {
                name: "Luca",
                surname: "Neri",
                photoProfile: "https://via.placeholder.com/50/505050/ffffff?Text=LN",
                link: "/artigiani/luca-neri",
            },
        },
        quantity: Math.floor(Math.random() * 5) + 1,
    },
    {
        product: {
            id: 105,
            name: "Candela Profumata Artigianale alla Lavanda",
            link: "/prodotti/sofia-gialli/candela-profumata-artigianale-alla-lavanda",
            thumbnail: "https://via.placeholder.com/150/b0b0b0/000000?Text=Candela+Lavanda",
            description:
                "Candela profumata realizzata a mano con cera naturale e olio essenziale di lavanda. Ideale per creare un'atmosfera rilassante.",
            price: 18.5,
            categories: [
                {
                    name: "Candele e Profumi per la Casa",
                    link: "/categorie/candele-profumi",
                },
                {
                    name: "Benessere",
                    link: "/categorie/benessere",
                },
            ],
            artisan: {
                name: "Sofia",
                surname: "Gialli",
                photoProfile: "https://via.placeholder.com/50/404040/ffffff?Text=SG",
                link: "/artigiani/sofia-gialli",
            },
        },
        quantity: Math.floor(Math.random() * 5) + 1,
    },
];

const makeProdElement=(item)=>{
    let cont=document.createElement("div");
    cont.classList.add("row", "product", "shadow");
    cont.dataset.id=item.product.id;

    let imgCont=document.createElement("div");
    imgCont.classList.add("col-sm-4");
    let img=document.createElement("img");
    img.classList.add("lazyImages");
    loadImage(img);
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
                <button class="removeOne" title="Rimuovi uno"><i class="fa-solid fa-minus"></i></button>
                <input class="quantityShow" type="number" value="${item.quantity}" data-id="${item.product.id}" min="1">
                <button class="addOne" title="Aggiungi uno"><i class="fa-solid fa-plus"></i></button>
            </div>
            <button class="removeProduct btn btn-outline-danger rounded-4" data-id="${item.product.id}"><i class="fa-solid fa-trash-can"></i><div>Rimuovi</div></button>
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

const loadCart=async()=>{
    const container=document.getElementById("productList");
    container.innerHTML="";
    let numProducts=0;
    //sostitutire con API
    const response=fakeCart;
    response.forEach(item=>{
        numProducts+=item.quantity;
        localCart.push({
            id:item.product.id,
            quantity:item.quantity,
            price:item.product.price
        });
        container.appendChild(makeProdElement(item));
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