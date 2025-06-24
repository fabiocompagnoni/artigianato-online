import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";

const makeArtisanDiv=(artisan)=>{
    let cont=document.createElement("div");
    cont.classList.add("artigiano","shadow-sm");
    let img=document.createElement("img");
    img.classList.add("lazyImages");
    img.dataset.src=artisan.photoProfile;
    img.alt=`${artisan.name} ${artisan.surname}`;
    loadImage(img);

    let div=document.createElement("div");
    div.classList.add("bodyArtigiano");
    div.innerHTML=`
        <div class='nomeArtigiano'>${artisan.name} ${artisan.surname}</div>
        <p class='bioArtigiano'>${artisan.bio}</p>
        <div class='text-end'><a href='${artisan.link}' class="cta cta-secondary">Visita la sue opere</a></div>
    `;
    return cont;
}

const loadArtisans=async()=>{
    let cont=document.getElementById("listArtigiani");
    try{
        const req=await ajax("https://localhost:3000/users/artisans/1");
        if(req.error!=null){
            throw new Error(req.error);
        }
        cont.innerHTML="";
        const shuffled = Array.from(req).sort(() => Math.random() - 0.5);
        console.log(shuffled);
        shuffled.slice(0, 4).forEach(artisan => {
            cont.appendChild(makeArtisanDiv(artisan));
        });
        if(req.artisans.length==0){
            cont.innerHTML=`<div class='card'><div class='card-body'>Ancora nessun artigiano registrato. Condividi questo sito con il tuo artigiano di fiducia e aiutalo a raggiungere molti più clienti grazie al nostro marketplace.</div></div>`
        }
    }catch(err){
        console.error(err);
    }
}
document.addEventListener("DOMContentLoaded",()=>{
    loadArtisans();
})