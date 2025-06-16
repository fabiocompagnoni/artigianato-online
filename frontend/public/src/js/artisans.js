import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";

let filter={};
let searchString=null;
let page=1;


const makeArtisanDiv=(artisan)=>{
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
    
    //TODO: chiamata api per anteprima prodotti
    let response=[
        {
            link:"/prodotto1",
            thumbnail:"https://100k-faces.glitch.me/random-image",
            name:"Prodotto 1",
            price:20.50
        },
        {
            link:"/prodotto2",
            thumbnail:"https://100k-faces.glitch.me/random-image",
            name:"Prodotto 2",
            price:10
        },
        {
            link:"/prodotto3",
            thumbnail:"https://100k-faces.glitch.me/random-image",
            name:"Prodotto 3",
            price:30
        }
    ];
    
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

const mockupArtisans = [
    {
        id: 1,
        name: "Mario",
        surname: "Rossi",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Artigiano del legno specializzato in intagli.",
        reviews: 4.5,
        link: "/artigiani/mario-rossi"
    },
    {
        id: 2,
        name: "Giulia",
        surname: "Verdi",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Creatrice di gioielli in argento e pietre naturali.",
        reviews: 3.8,
        link: "/artigiani/giulia-verdi"
    },
    {
        id: 3,
        name: "Luca",
        surname: "Bianchi",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Ceramista con una passione per i colori vivaci.",
        reviews: 4.2,
        link: "/artigiani/luca-bianchi"
    },
    {
        id: 4,
        name: "Anna",
        surname: "Neri",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Sarta specializzata in abiti su misura.",
        reviews: 4.9,
        link: "/artigiani/anna-neri"
    },
    {
        id: 5,
        name: "Paolo",
        surname: "Gialli",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Fabbro che crea oggetti unici in ferro battuto.",
        reviews: 4.0,
        link: "/artigiani/paolo-gialli"
    },
    {
        id: 6,
        name: "Francesca",
        surname: "Blu",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Artista che dipinge quadri con colori acrilici.",
        reviews: 3.5,
        link: "/artigiani/francesca-blu"
    },
    {
        id: 7,
        name: "Roberto",
        surname: "Viola",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Scultore che modella statue in argilla.",
        reviews: 4.7,
        link: "/artigiani/roberto-viola"
    },
    {
        id: 8,
        name: "Elena",
        surname: "Rosa",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Ricamatrice che crea opere d'arte con ago e filo.",
        reviews: 4.3,
        link: "/artigiani/elena-rosa"
    },
    {
        id: 9,
        name: "Simone",
        surname: "Marrone",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Falegname che costruisce mobili artigianali.",
        reviews: 3.9,
        link: "/artigiani/simone-marrone"
    },
    {
        id: 10,
        name: "Chiara",
        surname: "Grigi",
        photoProfile: "https://100k-faces.glitch.me/random-image",
        bio: "Designer che crea borse e accessori in pelle.",
        reviews: 4.6,
        link: "/artigiani/chiara-grigi"
    }
];
const loadArtisans=async(page=1)=>{
    try{
        //TODO: api per ottenere gli artigiani
        const artisans=mockupArtisans;
        const container=document.getElementById("listArtisans");
        
        container.innerHTML="";
        artisans.forEach(artisan=>{
            container.appendChild(makeArtisanDiv(artisan));
        });
        //todo: sostituire con pagine reali
        makePagination(page,1);
    }catch(err){
        console.error(err);
    }
}

//document.addEventListener("DOMContentLoaded",loadArtisans);