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
    if(!res.ok)
        alert('Errore nell\'aggiunta al carrello');
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