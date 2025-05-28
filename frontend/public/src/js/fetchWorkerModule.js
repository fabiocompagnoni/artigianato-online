/**
 * @author Fabio Compagnoni
 * @version 1.0
 */

export const ajax=async(url, method="GET", body=null, headers=null)=>{
    return new Promise((resolve, reject)=>{
        const worker=new Worker("/src/js/worker/jsonResolver.js");
        
        worker.postMessage({
            url:url,
            method:method,
            body:body,
            headers:headers
        });
        worker.addEventListener("message",(e)=>{
            if(e.data==null)
                reject();
            resolve(e.data);
        });
    })
}