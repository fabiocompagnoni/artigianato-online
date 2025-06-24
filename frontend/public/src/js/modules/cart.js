export const addToCart=async (idProd, quantity)=>{
    const res = await fetch('https://localhost:3000/purchases/addToCart', {
        method: 'POST',
        headers: {"Content-Type": "application/json; charset=utf-8"},
        body: JSON.stringify([{
            id: idProd,
            quantity
        }]),
        credentials: 'include'
    });
    if(res.status==401||res.status==403){
        popupCart("Per continuare con l'acquisto devi prima effettuare l'accesso");
    }else if(res.status==200){
        popupCart();
    }else{
        popupCart("Errore nell'aggiunta del prodotto al carrello");
    }
}

export const popupCart=(error=null)=>{
    let div = document.createElement("div");
    div.classList.add("popupCart");
    let str = error ?? "Il prodotto è stato aggiunto al carrello";
    div.innerHTML = `${str}`;
    document.body.appendChild(div);
    div.classList.add("show");
    setTimeout(() => {
        div.remove();
    }, 2000);
}

export const updateCart=(idProd, quantity)=>{

}
export const removeFromCart=async (idProd, quantity)=>{
    const res = await fetch('https://localhost:3000/purchases/addToCart', {
        method: 'POST',
        headers: {"Content-Type": "application/json; charset=utf-8"},
        body: JSON.stringify([{
            id: idProd,
            quantity: -quantity
        }]),
        credentials: 'include'
    });
    if(!res.ok)
        alert('Errore nella rimozione dal carrello');
}