import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";

let filter={};
let searchString=null;
let page=1;


const makeArtisanDiv=async (artisan)=>{
    let cont=document.createElement("div");
    cont.classList.add("artisan","shadow");
    cont.dataset.id=artisan.id;
    let c2=document.createElement("div");
    c2.classList.add("col-lg-8");
    let baseInfo=document.createElement("div");
    baseInfo.classList.add("baseInfo");
    let name=document.createElement("div");
    name.classList.add("name");
    name.innerHTML=`${artisan.name} ${artisan.surname}`;
    
    let img=document.createElement("img");
    img.classList.add("lazyImages", "photoProfile");
    img.dataset.src=artisan.photoProfile;
    loadImage(img);
    baseInfo.appendChild(img);
    baseInfo.appendChild(name);
    
    let bio=document.createElement("div");
    bio.classList.add("bio");
    bio.innerHTML=artisan.bio;
    
    let reviews=document.createElement("div");
    reviews.classList.add("reviews");
    if(artisan.reviews!=null){
        
        //stars by reviews value
        let stars=document.createElement("div");
        stars.classList.add("stars");
        let numStars=Math.floor(artisan.reviews);
        let decimalPart=artisan.reviews-numStars;
        let starString="";
        for(let i=0;i<numStars;i++){
            starString+="<i class='fa fa-star'></i>";
        }
        if(decimalPart>=0.5 && decimalPart<1){
            starString+="<i class='fa fa-star-half-o'></i>";
        }
        let emptyStars=5-Math.ceil(artisan.reviews);
        for(let i=0;i<emptyStars;i++){
            starString+="<i class='fa fa-star-o'></i>";
        }
        stars.innerHTML=starString;
        reviews.appendChild(stars);
        cont.appendChild(reviews);
    }
    
    let productPreview=document.createElement("div");
    productPreview.classList.add("productPreview","justify-content-md-end");
    
    const response = (await ajax('https://localhost:3000/products/1?artisan=' + artisan.slug)).products.slice(0, 3);
    
    response.forEach(product=>{
        let a=document.createElement("a");
        a.href=product.link;
        a.classList.add("prodPreview")
        let img=document.createElement("img");
        img.classList.add("lazyImages", "productPreviewImg");
        img.dataset.src=product.thumbnail;
        loadImage(img);
        a.appendChild(img);
        
        let title=document.createElement("div");
        title.classList.add("productPreviewTitle");
        title.innerHTML=product.name;
        a.appendChild(title);
        
        let price=document.createElement("div");
        price.classList.add("productPreviewPrice");
        price.innerHTML=parseFloat(product.price).toLocaleString("it-IT", { style: 'currency', currency: 'EUR' });
        a.appendChild(price);
        productPreview.appendChild(a);
    });

    
    
    cont.appendChild(baseInfo);
    cont.appendChild(bio);
    let cFlex=document.createElement("div");
    cFlex.classList.add("row");
    let col1=document.createElement("div");
    col1.classList.add("col-md-5", "col1");
    if(artisan.reviews!=null){
        col1.appendChild(reviews);
    }
    let btnShow=document.createElement("a");
    btnShow.classList.add("btnCTAArtisan");
    btnShow.href=artisan.link;
    btnShow.innerHTML="Scopri l'artigiano";
    col1.appendChild(btnShow);
    cFlex.appendChild(col1);

    let col2=document.createElement("div");
    col2.classList.add("col-md-7", "col2", "my-2","my-lg-0");
    col2.appendChild(productPreview);
    cFlex.appendChild(col2);
    cont.appendChild(cFlex);
    return cont;
    
}

const makePagination=(currentPage, pages)=>{
    let cont=document.getElementById("paginationContainer");
    cont.innerHTML="";
    for(let i=1;i<=pages;i++){
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
    loadArtisans(page);
});

async function toMockArtisans(artisans) {
    let result = [];
    for(const artisan of artisans) {
        const artisan_slug = artisan.link.split('/')[2];
        const artisan_info = await ajax('https://localhost:3000/users/user/' + artisan_slug);
        result.push({...artisan, reviews: artisan.reviews_avg, bio: artisan_info.bio, slug: artisan_slug});
    }

    return result;
}

const loadArtisans=async(page=1)=>{
    try{
        const artisans=await toMockArtisans((await ajax('https://localhost:3000/users/artisans/' + page)).artisans);
        const container=document.getElementById("listArtisans");
        
        container.innerHTML="";
        artisans.forEach(async artisan=>{
            container.appendChild(await makeArtisanDiv(artisan));
        });
        //todo: sostituire con pagine reali
        makePagination(page,1);
    }catch(err){
        console.error(err);
    }
}

//document.addEventListener("DOMContentLoaded",loadArtisans);