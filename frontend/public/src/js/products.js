/**
 * @version 1.0
 * @author Fabio Compagnoni
 */

import {loadImage} from "/src/js/modules/loadImageModule.js";
import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import { addToCart } from "/src/js/modules/cart.js";
let filter={};
let orderBy={};

const initPage=async()=>{
  if(window.artisanPage){
    filter.artisan=window.artisanSlug;
    //show artisan info
    //make request to get artisan info
    //const request=await ajax(`https://localhost:4000/users/${window.artisanSlug}`,"GET");
    
    document.getElementById("pageTitle").innerHTML="";
    document.getElementById("pageDesc").innerHTML="";
  }
  loadProducts();
}

document.addEventListener("DOMContentLoaded",initPage);

let mockupResponse=[
  {
    "id": 101,
    "name": "Vaso in Ceramica Dipinto a Mano - Motivi Floreali",
    "link": "/prodotti/elena-rossi/vaso-ceramica-dipinto-a-mano-motivi-floreali",
    "thumbnail": "https://via.placeholder.com/150/f0f0f0/000000?Text=Vaso+Ceramica",
    "description": "Elegante vaso in ceramica realizzato a mano con delicati motivi floreali. Perfetto per decorare la tua casa o come regalo speciale.",
    "price": 35.00,
    "categories": [
      {
        "name": "Ceramiche",
        "link": "/categorie/ceramiche"
      },
      {
        "name": "Decorazioni per la casa",
        "link": "/categorie/decorazioni-casa"
      }
    ],
    "artisan": {
      "name": "Elena",
      "surname": "Rossi",
      "photoProfile": "https://via.placeholder.com/50/808080/ffffff?Text=ER",
      "link": "/artigiani/elena-rossi"
    }
  },
  {
    "id": 102,
    "name": "Collana in Argento 925 con Pietra Ametista",
    "link": "/prodotti/marco-bianchi/collana-argento-925-pietra-ametista",
    "thumbnail": "https://via.placeholder.com/150/e0e0e0/000000?Text=Collana+Argento",
    "description": "Raffinata collana in argento sterling 925 con una splendida pietra di ametista. Un gioiello unico per ogni occasione.",
    "price": 55.00,
    "categories": [
      {
        "name": "Gioielli",
        "link": "/categorie/gioielli"
      },
      {
        "name": "Collane",
        "link": "/categorie/collane"
      }
    ],
    "artisan": {
      "name": "Marco",
      "surname": "Bianchi",
      "photoProfile": "https://via.placeholder.com/50/707070/ffffff?Text=MB",
      "link": "/artigiani/marco-bianchi"
    }
  },
  {
    "id": 103,
    "name": "Tagliere in Legno d'Olivo Fatto a Mano",
    "link": "/prodotti/giulia-verdi/tagliere-legno-olivo-fatto-a-mano",
    "thumbnail": "https://via.placeholder.com/150/d0d0d0/000000?Text=Tagliere+Legno",
    "description": "Tagliere unico in legno d'olivo massello, ideale per servire formaggi, salumi o come elemento decorativo in cucina.",
    "price": 40.00,
    "categories": [
      {
        "name": "Articoli per la cucina",
        "link": "/categorie/articoli-cucina"
      },
      {
        "name": "Legno",
        "link": "/categorie/legno"
      }
    ],
    "artisan": {
      "name": "Giulia",
      "surname": "Verdi",
      "photoProfile": "https://via.placeholder.com/50/606060/ffffff?Text=GV",
      "link": "/artigiani/giulia-verdi"
    }
  },
  {
    "id": 104,
    "name": "Sciarpa in Lana Merinos Lavorata a Maglia",
    "link": "/prodotti/luca-neri/sciarpa-lana-merinos-lavorata-a-maglia",
    "thumbnail": "https://via.placeholder.com/150/c0c0c0/000000?Text=Sciarpa+Lana",
    "description": "Calda e morbida sciarpa in pura lana merinos, lavorata a mano con una delicata trama. Perfetta per le giornate fredde.",
    "price": 60.00,
    "categories": [
      {
        "name": "Accessori",
        "link": "/categorie/accessori"
      },
      {
        "name": "Abbigliamento",
        "link": "/categorie/abbigliamento"
      }
    ],
    "artisan": {
      "name": "Luca",
      "surname": "Neri",
      "photoProfile": "https://via.placeholder.com/50/505050/ffffff?Text=LN",
      "link": "/artigiani/luca-neri"
    }
  },
  {
    "id": 105,
    "name": "Candela Profumata Artigianale alla Lavanda",
    "link": "/prodotti/sofia-gialli/candela-profumata-artigianale-alla-lavanda",
    "thumbnail": "https://via.placeholder.com/150/b0b0b0/000000?Text=Candela+Lavanda",
    "description": "Candela profumata realizzata a mano con cera naturale e olio essenziale di lavanda. Ideale per creare un'atmosfera rilassante.",
    "price": 18.50,
    "categories": [
      {
        "name": "Candele e Profumi per la Casa",
        "link": "/categorie/candele-profumi"
      },
      {
        "name": "Benessere",
        "link": "/categorie/benessere"
      }
    ],
    "artisan": {
      "name": "Sofia",
      "surname": "Gialli",
      "photoProfile": "https://via.placeholder.com/50/404040/ffffff?Text=SG",
      "link": "/artigiani/sofia-gialli"
    }
  }
];

const makeProductDiv=(prodotto)=>{
    let linkProd=document.createElement("a");
    linkProd.href=prodotto.link;
    linkProd.classList.add("product");

    let thumbnail=document.createElement("img");
    thumbnail.dataset.src=prodotto.thumbnail;
    thumbnail.classList.add("lazyImages","thumbnailProd");
    loadImage(thumbnail);
    linkProd.appendChild(thumbnail);
    
    let bodyProd=document.createElement("div");
    bodyProd.classList.add("bodyProd");

    let title=document.createElement("div");
    title.classList.add("titleProd");
    title.textContent=prodotto.name;
    bodyProd.appendChild(title);

    let desc=document.createElement("div");
    desc.classList.add("descProd");
    desc.textContent=prodotto.description;
    bodyProd.appendChild(desc);

    let artisanCont=document.createElement("a");
    artisanCont.classList.add("artisanCont");
    artisanCont.href=prodotto.artisan.link;
    
    let profilePicture=document.createElement("img");
    profilePicture.dataset.src=prodotto.artisan.photoProfile;
    profilePicture.classList.add("profilePicture","lazyImages");
    loadImage(profilePicture);
    artisanCont.appendChild(profilePicture);
    let nameArtisan=document.createElement("div")
    nameArtisan.innerHTML=`${prodotto.artisan.name} ${prodotto.artisan.surname}`;
    nameArtisan.classList.add("nameArtisan");
    artisanCont.appendChild(nameArtisan);
    bodyProd.appendChild(artisanCont);

    let rowPrice=document.createElement("div");
    rowPrice.classList.add("rowPrice");

    let price=document.createElement("div");
    price.classList.add("price");
    price.innerHTML=parseFloat(prodotto.price).toLocaleString("it-IT",{style:"currency",currency:"EUR"});
    rowPrice.appendChild(price);

    let btnAddToCart=document.createElement("button");
    btnAddToCart.classList.add("btnAddToCart");
    btnAddToCart.innerHTML=`<i class="fa-solid fa-cart-plus"></i><div>Aggiungi al carrello</div>`;
    btnAddToCart.addEventListener("click",(e)=>{
        e.preventDefault();
        addToCart(prodotto.id,1);
    });

    rowPrice.appendChild(btnAddToCart);
    bodyProd.appendChild(rowPrice);
    linkProd.appendChild(bodyProd);
    
    return linkProd;
}

const loadProducts=async()=>{
    const containerProducts=document.getElementById("productList");
    try{
        //aggiungere anche filtri e ordinamento
        //aggiungere filtro artigiano
        //const products=await ajax("https://localhost:4000/products","GET");
        const products=mockupResponse;
        if(products.length==0){
            containerProducts.innerHTML="Nessun prodotto disponibile. Contatta il tuo artigiano di fiducia e fagli inserire i suoi prodotti!";
            return;
        }
        containerProducts.innerHTML="";
        products.forEach((prodotto)=>{
            containerProducts.appendChild(makeProductDiv(prodotto));
        });
    }catch(err){
        console.error(err);
    }
}

const loadCategory=async()=>{
    const listCategory=document.getElementById("categoryList");
    const listCategoryMobile=document.getElementById("categoryListMobile");
    try{
        const request=await ajax("https://localhost:4000/category","GET");
        const categories=await request.json();
        categories.forEach((category)=>{
        });
    }catch(err){
        console.error(err);
    }
}

const mapOrder=(value)=>{
  switch(value){
    case 0:"timestamp_creation DESC"; break;
    case 1:"timestamp_creation ASC"; break;
    case 2:"price DESC"; break;
    case 3:"price ASC"; break;
    case 4:"name ASC"; break;
    case 5:"name DESC"; break;
    default:
  }
}

document.getElementById("openSearchMobile").addEventListener("click",()=>{
  document.getElementById("searchComponentMobile").classList.toggle("showed");
});

document.getElementById("btnCloseSearchMobile").addEventListener("click",()=>{
    document.getElementById("searchComponentMobile").classList.toggle("showed");
});

document.getElementById("openFilterMobile").addEventListener("click",()=>{
  document.getElementById("filterPart").style.display="flex";
  document.getElementById("orderPart").style.display="none";
  document.getElementById("filterComponentMobile").classList.add("showed");
});

document.getElementById("openOrderMobile").addEventListener("click",()=>{
  document.getElementById("filterPart").style.display="none";
  document.getElementById("orderPart").style.display="flex";
  document.getElementById("filterComponentMobile").classList.add("showed");
});

document.getElementById("btnCloseFilterMobile").addEventListener("click",()=>{
  document.getElementById("filterComponentMobile").classList.remove("showed");
});

//ordinamento mobile
document.querySelectorAll("[name='orderMobile']").forEach((radio) => {
  radio.addEventListener("change", (event) => {
    let label=event.target.labels[0];
    document.querySelectorAll(".selectorOrder").forEach((r)=>{
      r.classList.remove("checked");
    });
    label.classList.toggle("checked");
    orderBy=mapOrder(event.target.value);
    loadProducts();
  });
});

//ordinamento desktop
document.getElementById("selectOrdinamentoMobile").addEventListener("change",(event)=>{
  filter=mapOrder(event.target.value);
});

//disponibilità desktop
document.querySelectorAll("[dispDesktop]").forEach((check)=>{
  check.addEventListener("change",(event)=>{
    console.log(event.target.value);
    if(!filter.disponibilita){
      filter.disponibilita=[];
    }
    if(event.target.checked){
      if(!(filter.disponibilita && filter.disponibilita.includes(event.target.value))){
        filter.disponibilita.push(event.target.value);
      }
    }else{
      filter.disponibilita=filter.disponibilita.filter(item=>item!=event.target.value);
    }
    console.log(filter);
  });
});

//prezzi desktop
document.getElementById("priceMin").addEventListener("change",(event)=>{
  if(!filter.prezzi){
    filter.prezzi={};
  }
  filter.prezzi.min=event.target.value;
});

document.getElementById("priceMax").addEventListener("change",(event)=>{
  if(!filter.prezzi){
    filter.prezzi={};
  }
  filter.prezzi.max=event.target.value;
});

//ricerca
let timerRicerca;
const handleRicerca=(queryString)=>{

}
document.getElementById("textQuery").addEventListener("keyup",(event)=>{
  timerRicerca=setTimeout(()=>{
    clearTimeout(timerRicerca);
    handleRicerca(event.target.value);
  },500);
});

document.getElementById("textSearchMobile").addEventListener("keyup",(event)=>{
  timerRicerca=setTimeout(()=>{
    clearTimeout(timerRicerca);
    handleRicerca(event.target.value);
  },500);
});

