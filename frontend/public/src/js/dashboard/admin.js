import {ajax} from "/src/js/modules/fetchWorkerModule.js";

let filterStatus=null;
let filterType=null;

const makeDivTicket=(ticketInfo)=>{
    let tInfo=document.createElement("div");
    tInfo.classList.add("ticket", "row");
    let c1=document.createElement("div");
    c1.classList.add("col-sm-4");
    let c2=document.createElement("div");
    c2.classList.add("col-sm-4");
    c2.innerHTML="";
    if(ticketInfo.type=="order"){
        c1.innerHTML=`Ordine #${ticketInfo.order_id} del ${new Date(ticketInfo.)}`;
    }   
    let c3=document.createElementById("div");
    c3.classList.add("col-sm-4");
    c3.innerHTML=`
        <div class='pillType text-uppercase'>${ticketInfo.type}</div>
        <div class='pillStatus'>${ticketInfo.status}</div>
        <button class='btn btn-secondary roundend-4'>Mostra richiesta</button>
    `;
    return tInfo;
    
}

const loadTickets=async(page=1)=>{
    let cont=document.getElementById("ticketContainer");
    const request=await ajax("localhost:3000/tickets/fetchTickets/"+page);
    //TODO: fare filtri

    if(request.error!=null){
        cont.innerHTML="Si è verificato un errore nel caricamento dei ticket";
        return;
    }

    request.tickets.forEach(ticket=>{
        cont.appendChild(makeDivTicket(ticket));
    })

    //TODO: fare cambio pagina

}