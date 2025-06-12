/**
 * @author Fabio Compagnoni
 * @version 1.0
 */

export const loadImage=async (imgElement) =>{
    return new Promise((resolve, reject)=>{
        const worker=new Worker("/src/js/worker/mediaServiceWorker.js");
        worker.postMessage([imgElement.dataset.src]);
        worker.addEventListener("message",(e)=>{
            imgElement.src=e.data[0];
            imgElement.classList.remove("lazyLoading");
            resolve();
        });
    });
}