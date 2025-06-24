/**
 * @version 1.0
 * @author Fabio Compagnoni
 */

import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";
import {addToCart} from "/src/js/modules/cart.js";
import {initProductQuantitySelectors} from "/src/js/modules/productQuantitySelector.js";



/*actions for custom product selectors*/
document.addEventListener("DOMContentLoaded",initProductQuantitySelectors);

/*add to cart listener*/
const initAddToCart=()=>{
    document.getElementById("addToCartBtn").addEventListener("click",async(e)=>{
        e.preventDefault();
        let quantity=parseInt(document.querySelector(".customQuantitySelector input").value);
        let url=window.location.pathname;
        let urlPart=url.split("/");
        let slugProd=urlPart[urlPart.length-1];
        let slugArtisan=urlPart[urlPart.length-2];

        const prod_info = await ajax(`https://localhost:3000/products/product/${slugArtisan}/${slugProd}`);
        addToCart(prod_info.id, quantity);
    });
}

const loadProductInfo=async()=>{
    try{
        let url=window.location.pathname;
        let urlPart=url.split("/");
        let slugProd=urlPart[urlPart.length-1];
        let slugArtisan=urlPart[urlPart.length-2];

        //loading product info from api
        const request=await ajax(`https://localhost:3000/products/product/${slugArtisan}/${slugProd}`);
        /*seo part*/
        document.getElementById("titleProductPage").innerText=request.name;
        document.getElementById("seoDescription").innerText=request.short_description;
        /*informazioni del prodotto*/
        document.getElementById("productName").innerText=request.name;
        document.getElementById("productDescShort").innerHTML=request.short_description;
        //categorie del prodotto
        let catList=document.getElementById("productCategoryList");
        catList.innerHTML="";
        request.categories.forEach(cat=>{
            let a=document.createElement("a");
            a.href=cat.link;
            a.innerText=cat.name;
            catList.appendChild(a);
        });
        
        /*foto del prodotto*/
        document.querySelector(".primaryImage").dataset.src=request.images[0].url;
        loadImage(document.querySelector(".primaryImage"));
        
        if(request.images.length>1){
            let imgs=document.querySelectorAll(".lateralPreviews img");
            if(request.images.length<imgs.length){
                for(let i=request.images.length-1; i<imgs.length; i++){
                    imgs[i].remove();
                }
            }else{
                for(let i=imgs.length; i<request.images.length; i++){
                    let img=document.createElement("img");
                    img.classList.add("img-fluid");
                    document.querySelector(".lateralPreviews").appendChild(img);
                }
                imgs=document.querySelectorAll(".lateralPreviews img");
            }
            request.images.slice(1).forEach((img, i) => {
                imgs[i].dataset.src=img.url;
                loadImage(imgs[i]);
                imgs[i].alt="Foto "+(i+1);
            });

        }
        if(window.innerWidth<=768){
            handleImageMobile(request.images);
        }
        //informazioni artigiano
        document.querySelectorAll(".artisanProfilePicture").forEach(img=>{
            //TODO: mettere foto profilo img.dataset.src=request.artisan.
            
        });
        document.querySelectorAll(".artisanName").forEach(artisanName=>{
            artisanName.innerText=request.artisan.name+" "+request.artisan.surname;
            artisanName.classList.remove("placeholder-glow");
        });
        document.getElementById("contArtisanCont").href=request.artisan.link;

        document.getElementById("priceProduct").innerHTML=parseFloat(request.price).toLocaleString('it-IT', {style: 'currency', currency: 'EUR'});

        document.getElementById("productDisponibity").innerHTML=`
            <div class='pillDisponibility ${request.quantity>0 ? "text-bg-success" : "text-bg-danger"}'></div>
            <div>${request.quantity>0 ? "Disponibile" : "Non disponibile"}</div>
        `
        
        document.getElementById("productDescription").innerHTML=request.description;
        document.getElementById("dateUploadProduct").innerHTML = new Date(request.timestamp_creation).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        initAddToCart();
        loadReviews(request.artisan);
        otherProdArtisanLoad(slugArtisan, slugProd);
        similarProductsLoad(slugProd);

        document.getElementById("btnHandleSegnalazione").addEventListener("click",()=>{
        handleProblem(slugArtisan, slugProd);
    });
    }catch(err){
        console.error(err);
    }
}

const loadReviewsList=async(page, artisanSlug)=>{
    let reviewLists=document.getElementById("reviewsList");
    const req=await ajax(`https://localhost:3000/users/reviews/${artisanSlug}/${page}`);
    if(req.error!=null){
        reviewLists.innerHTML="Si è verificato un errore nel caricamento delle recensioni";
    }
    reviewLists.innerHTML="";
    Array.from(req.reviews).forEach(review=>{
        let revCont=document.createElement("div");
        revCont.classList.add("review");

        let rName=document.createElement("div");
        rName.classList.add("fw-bold");
        rName.innerHTML=`${review.reviewer_name} ${review.reviewer_surname}`;
        
        let rDate=document.createElement("div");
        rDate.classList.add("text-muted");
        let date=new Date(review.timestamp).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        rDate.innerHTML=date;

        let starsCont=document.createElement("div");
        let avg = parseFloat(review.rating) || 0;
        let fullStars = Math.floor(avg);
        let halfStar = (avg - fullStars) >= 0.5 ? 1 : 0;
        let emptyStars = 5 - fullStars - halfStar;

        let starsHtml = '';
        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<i class="fa-solid fa-star"></i>';
        }
        if (halfStar) {
            starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<i class="fa-regular fa-star"></i>';
        }
        starsCont.innerHTML = starsHtml;
        
        let recText=document.createElement("p");
        recText.innerHTML=review.review_text;
        revCont.appendChild(rName);
        revCont.appendChild(rDate);
        revCont.appendChild(starsCont);
        revCont.appendChild(recText);
        reviewLists.appendChild(revCont);
    });
    //TODO: mettere pagination
}

const makeProdCard=(prodotto)=>{
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

    if(prodotto.artisan!=null){
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
    }

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

const otherProdArtisanLoad=async(slug_artisan, slug_product)=>{
    let cont=document.getElementById("otherProdList");
    const req=await ajax(`https://localhost:3000/products/correlated/${slug_artisan}/${slug_product}`);
    if(req.error!=null){
        cont.innerHTML="Si è verificato un errore nel caricamento dei prodotti correlati";
        return;
    }
    cont.innerHTML="";
    req.products.forEach(product=>{
        cont.appendChild(makeProdCard(product));
    });
}

const similarProductsLoad=async(slug_prod)=>{
    let cont=document.getElementById("similarProductsList");
    const req=await ajax(`https://localhost:3000/products/similar/${slug_prod}`);
    if(req.error!=null){
        cont.innerHTML="Si è verificato un errore nel caricamento dei prodotti simili";
        return;
    }
    cont.innerHTML="";
    req.products.forEach(product=>{
        cont.appendChild(makeProdCard(product));
    });
}
const loadReviews=async(artisan)=>{
    let contReviews=document.querySelector(".artisanReviewsCont");
    let reviewLists=document.getElementById("reviewsList");
    document.getElementById("numReviews").innerHTML=artisan.reviews_total;
    document.getElementById("averageReviews").innerHTML=artisan.reviews_avg;
    document.getElementById("starReviewResume").innerHTML="";
    // Calcola il numero di stelle piene, mezze e vuote
    let avg = parseFloat(artisan.reviews_avg) || 0;
    let fullStars = Math.floor(avg);
    let halfStar = (avg - fullStars) >= 0.5 ? 1 : 0;
    let emptyStars = 5 - fullStars - halfStar;

    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fa-solid fa-star"></i>';
    }
    if (halfStar) {
        starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="fa-regular fa-star"></i>';
    }
    document.getElementById("starReviewResume").innerHTML = starsHtml;

    if(artisan.reviews_total==0){
        reviewLists.innerHTML="Questo artigiano non ha ancora ricevuto recensioni. Fai un acquisto e recensisci il tuo artigiano preferito!";
        return;
    }
    let slugArtisan=artisan.link.split("/").pop();
    
    loadReviewsList(1, slugArtisan);
}

document.addEventListener("DOMContentLoaded",loadProductInfo);

// Scroll amount in pixels
const SCROLL_AMOUNT = "5rem";

document.getElementById("scrollTopBtn").addEventListener("click", (event) => {
    let cont = document.querySelector(".lateralPreviews");
    cont.scrollBy({ top: -SCROLL_AMOUNT, behavior: "smooth" });
});

document.getElementById("scrollBottonBtn").addEventListener("click", (event) => {
    let cont = document.querySelector(".lateralPreviews");
    cont.scrollBy({ top: SCROLL_AMOUNT, behavior: "smooth" });
});

const handleImageMobile=(arrayFoto)=>{
    let currentIndex = 0;
    const primaryImage = document.querySelector(".primaryImage");

    const showImage = (index) => {
        if (index < 0) index = 0;
        if (index >= arrayFoto.length) index = arrayFoto.length - 1;
        currentIndex = index;
        primaryImage.dataset.src = arrayFoto[currentIndex].url;
        loadImage(primaryImage);
    };

    // Touch events
    let startX = null;
    primaryImage.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX;
    });
    primaryImage.addEventListener("touchend", (e) => {
        if (startX === null) return;
        let endX = e.changedTouches[0].clientX;
        if (endX - startX > 50) {
            // swipe right
            showImage(currentIndex - 1);
        } else if (startX - endX > 50) {
            // swipe left
            showImage(currentIndex + 1);
        }
        startX = null;
    });

    // Mouse events
    let mouseDownX = null;
    primaryImage.addEventListener("mousedown", (e) => {
        mouseDownX = e.clientX;
    });
    primaryImage.addEventListener("mouseup", (e) => {
        if (mouseDownX === null) return;
        let mouseUpX = e.clientX;
        if (mouseUpX - mouseDownX > 50) {
            // drag right
            showImage(currentIndex - 1);
        } else if (mouseDownX - mouseUpX > 50) {
            // drag left
            showImage(currentIndex + 1);
        }
        mouseDownX = null;
    });
}

let mobileHandlerInitialized = false;
let mobileImages = [];

const initMobileImageHandler = (images) => {
    if (!mobileHandlerInitialized) {
        handleImageMobile(images);
        mobileHandlerInitialized = true;
    }
};

const destroyMobileImageHandler = () => {
    // No-op: handleImageMobile only adds listeners, so page reload or DOM changes will reset
    mobileHandlerInitialized = false;
};

const checkAndInitMobileImageHandler = () => {
    const images = Array.from(document.querySelectorAll(".lateralPreviews img")).map(img => img.dataset.src).filter(Boolean);
    if (window.innerWidth <= 768 && images.length > 0) {
        initMobileImageHandler(images);
    } else {
        destroyMobileImageHandler();
    }
};



const handleProblem=async(artisanSlug, productId)=>{
    let text=document.getElementById("segnalazioneText").value;
    const req=await fetch(`https://localhost:3000/products/report/${artisanSlug}/${productId}`,{
        method: "POST",
        body: JSON.stringify({
            note:text
        }),
        headers: {"Content-Type": "application/json; charset=utf-8"},
        credentials: 'include'
    }
    );
    const json = await req.json();
    if(!req.ok){
        if(req.error.message=="Unauthorized"){
            document.getElementById("respSegnalazione").innerHTML="Devi aver prima fatto l'accesso per poter inviare una segnalazione";
        }else{
            document.getElementById("respSegnalazione").innerHTML="Si è verificato un errore durante la segnalazione. Riprova più tardi";
        }
    }else if(json.ticket_id!=null){
        document.getElementById("respSegnalazione").innerHTML=`La tua segnalazione è stata presa in carico. L'identificativo della tua richiesta è: ${json.ticket_id}`;
    }
}



window.addEventListener("resize", checkAndInitMobileImageHandler);
document.addEventListener("DOMContentLoaded", checkAndInitMobileImageHandler);