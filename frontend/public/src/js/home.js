import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";

const makeArtisanDiv=(artisan)=>{
    let cont=document.createElement("div");
    cont.classList.add("artigiano","shadow-sm");
    let img=document.createElement("img");
    img.classList.add("lazyImages");
    //img.dataset.src=artisan.
}

const loadArtisans=async()=>{
    let cont=document.getElementById("listArtigiani");
}
const loadComments=async()=>{

}