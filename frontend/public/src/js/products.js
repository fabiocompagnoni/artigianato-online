/**
 * @version 1.0
 * @author Fabio Compagnoni
 */

import {loadImage} from "/src/js/modules/loadImageModule.js";
import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import { addToCart } from "/src/js/modules/cart.js";
let filter={};
let orderBy=null;

const initPage=async()=>{
  if(window.artisanPage){
    filter.artisan=window.artisanSlug;
    //show artisan info
    //make request to get artisan info
    //const request=await ajax(`https://localhost:4000/users/${window.artisanSlug}`,"GET");
    
    document.getElementById("pageTitle").innerHTML="";
    document.getElementById("pageDesc").innerHTML="";
  }
  // Se il pathname contiene /categorie/slug categoria
  const pathParts = window.location.pathname.split("/");
  const catIndex = pathParts.indexOf("categorie");
  if (catIndex !== -1 && pathParts[catIndex + 1]) {
    filter.categories = [pathParts[catIndex + 1]];
  }
  //loadProducts();
}

document.addEventListener("DOMContentLoaded",initPage);

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

const mapFilter=()=>{
  let params=new URLSearchParams();
  for(const [key,value] of Object.entries(filter)){
    if(value!=null&&value!=undefined&&value!=""){
      params.append(key,value.toString());
    }
  }
  return params;
}


const initPagination=(currentPage, numPages)=>{
  let cont=document.getElementById("paginationContainer");
  cont.innerHTML="";
  for(let i=1;i<=numPages;i++){
      let a=document.createElement("a");
      a.href="#pagina"+i;
      if(i==currentPage){
          a.classList.add("active");
      }
      a.innerHTML=i;
      cont.appendChild(a);
  }
}

document.addEventListener("DOMContentLoaded",()=>{
    let url=new URL(window.location.href);
    let page=1;
    if(url.hash!=""&&url.hash.search("pagina")){
        page = parseInt(url.hash.substring(url.hash.lastIndexOf("a")+1));
    }
    loadProducts(page);
    loadCategory();
    window.addEventListener("hashchange", () => {
      let url = new URL(window.location.href);
      let page = 1;
      if (url.hash !== "" && url.hash.includes("pagina")) {
        page = parseInt(url.hash.substring(url.hash.lastIndexOf("a") + 1));
      }
      loadProducts(page);
    });
});

const loadProducts=async(page=1)=>{
    const containerProducts=document.getElementById("productList");
    try{
        let baseURL=`https://localhost:3000/products/${page}`;
        console.log(baseURL);
        if(Object.keys(filter).length > 0){
          baseURL+=`?${mapFilter()}`;
          if(orderBy!=null){
            baseURL+=`&order=${orderBy}`;
          }
        }else if(orderBy!=null){
            baseURL+=`?order=${orderBy}`;
        }
        const response=await ajax(baseURL,"GET");
        if(response.error!=null)
          throw new Error(response.error);
        if(response.products.length==0){
            containerProducts.innerHTML="Nessun prodotto disponibile. Contatta il tuo artigiano di fiducia e fagli inserire i suoi prodotti!";
            return;
        }
        containerProducts.innerHTML="";
        response.products.forEach((prodotto)=>{
            containerProducts.appendChild(makeProductDiv(prodotto));
        });
        initPagination(page, response.pages);
        
    }catch(err){
        console.error(err);
    }
}

const loadCategory=async()=>{
    const listCategory=document.getElementById("categoryList");
    const listCategoryMobile=document.getElementById("categoryListMobile");
    try{
      const request=await ajax("https://localhost:3000/products/categories","GET");
      if(request.error!=null)
        throw new Error(request.error);
      listCategory.innerHTML="";
      listCategoryMobile.innerHTML="";
      request.categories.forEach(category=>{
        let div=document.createElement("div");
        div.classList.add("form-check");
        div.innerHTML=`<input class='form-check-input' type='checkbox' name='productCategory' value='${category.slug}'>
        <label class='form-check-label'>${category.name}</label>`;
        let divCopy = div.cloneNode(true);
        listCategory.appendChild(divCopy);
        listCategoryMobile.appendChild(div);
      });

      document.querySelectorAll("input[name='productCategory']").forEach(category => {
        category.addEventListener("change", (event) => {
          console.log(event.target.value);
          if (!filter.categories) {
            filter.categories = [];
          }
          if (event.target.checked) {
            if (!filter.categories.includes(event.target.value)) {
              filter.categories.push(event.target.value);
            }
          } else {
            filter.categories = filter.categories.filter(cat => cat !== event.target.value);
          }
          loadProducts();
        });
      });
    }catch(err){
        console.error(err);
    }
}

const mapOrder = (value) => {
  switch (parseInt(value)) {
    case 0: return "timestamp_creation DESC";
    case 1: return "timestamp_creation ASC";
    case 2: return "price ASC";
    case 3: return "price DESC";
    case 4: return "pname ASC";
    case 5: return "pname DESC";
    default: return null;
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
  orderBy=mapOrder(event.target.value);
  loadProducts(1);
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
  loadProducts(1);
});

document.getElementById("priceMax").addEventListener("change",(event)=>{
  if(!filter.prezzi){
    filter.prezzi={};
  }
  filter.prezzi.max=event.target.value;
  loadProducts(1);
});

//ricerca
let timerRicerca;
const handleRicerca=(queryString)=>{
  filter.queryString=queryString;
  loadProducts();
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

