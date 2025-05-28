/**
 * @author Fabio Compagnoni
 * @version 1.0
 */

self.addEventListener(
    "message",
    async function(e) {
        try{
            const request=e.data;
            let requestFetch={
                method:request.method,
            };
            if(request.body!=null){
                requestFetch.body=JSON.stringify(request.body);
            }
            if(request.headers!=null){
                requestFetch.headers=request.headers;
            }
            const respRequest=await fetch(request.url,requestFetch);
            const response=await request.json();
            if(respRequest.status!=200){
                throw new Error(response.error!=null?response.error:respRequest.statusText);
            }
            self.postMessage(response);
        }catch(err){
            self.postMessage({error:err});
        }
    },
    false
);