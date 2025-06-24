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
        c1.innerHTML=`Ordine #${ticketInfo.order_id}<br/>`;
    }else if(ticketInfo.type=="product"){
        c1.innerHTML=`Prodotto #${ticketInfo.product_id}<br/>`
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

const makePagination=(currentPage, pages)=>{
    let cont=document.getElementById("pagination");
    for(let i=1;i<=pages;i++){
        let btn=document.createElementById("button");
        btn.addEventListener("click",()=>{
            loadTickets(i);
        });
        if(i==currentPage)
            btn.classList.add("selected");
        btn.innerHTML=i;
        cont.appendChild(btn);
    }
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
    makePagination(page, request.pages);
}

const loadTicket=async(id)=>{
    const req=await ajax("https://localhost:3000/tickets/ticket/"+id);
    if(req.error!=null){
        console.error(req.error);
    }
    document.getElementById("pageTitle").innerHTML="Bentornato, Amministratore";
}

document.addEventListener("DOMContentLoaded",async()=>{
    let homePage=document.getElementById("home");
    let ticketPage=document.getElementById("ticketDetail");

    // Verifica se la pagina contiene /admin/area-riservata/ticket/id del ticket
    const ticketDetailRegex = /\/admin\/area-riservata\/ticket\/(\d+)/;
    const match = window.location.pathname.match(ticketDetailRegex);
    if (match) {
        const ticketId = match[1];
        
        homePage.style.display="none";
        ticketPage.style.display="block";
        loadTicket(ticketId);

    }
    else if(window.location.pathname=="/admin/area-riservata"){
        homePage.style.display="block";
        ticketPage.style.display="none";
        document.getElementById("pageTitle").innerHTML="Bentornato, Amministratore";
        loadTickets(1);
    }
})