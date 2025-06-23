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
    document.getElementById("addToCartBtn").addEventListener("click",(e)=>{
        e.preventDefault();
        let quantity=parseInt(document.querySelector(".customQuantitySelector input").value);
        addToCart(window.productId, quantity);;
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
        //todo mettere nome reviewer quando api completa
        //let rName=
        let date=new Date(review.timestamp).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

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
        revCont.appendChild(starsCont);
        revCont.appendChild(recText);
        revCont.appendChild(date);
        reviewLists.appendChild(revCont);
    });
    //TODO: mettere pagination
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
    loadReviewsList(1);
    
}

document.addEventListener("DOMContentLoaded",loadProductInfo);