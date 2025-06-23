import {ajax} from "/src/js/modules/fetchWorkerModule.js";


let chart;
const initChartSell = async (labels, values) => {
    const {  Chart, 
        LinearScale,      
        CategoryScale,    
        TimeScale,
        LineElement, 
        PointElement, 
        LineController,
        Title,
        Tooltip,
        Legend  
    } = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm');
    
    Chart.register(
        LinearScale,      
        CategoryScale,  
        TimeScale,  
        LineElement,
        PointElement,
        LineController,   
        Title,
        Tooltip,
        Legend
    );

    if(chart)
        chart.destroy();
    chart = new Chart(document.getElementById("salesChart"), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Vendite',
                data: values,
                borderColor: '#A8BBA2',
                backgroundColor: '#2D5938',
                tension: 0.5,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10
                    },
                    type: 'linear',
                }
            }
        }
    });
}

async function getDashboardData(days) {
    return await (await fetch(
        "https://localhost:3000/products/dashboard/" + days,
        {credentials: "include"}
    )).json();
}

function gi(id) {
    return document.getElementById(id);
}

function toEuro(num) {
    return num.toLocaleString("it-IT", { style: "currency", currency: "EUR" })
}

function toGain(num) {
    return '+' + ('' + num).replace('.', ',') + '%';
}

gi('selectTimePerformace').addEventListener('change', e => changeSalesChart(e.target.value));

async function changeSalesChart(days) {
    const dashboard_data = await getDashboardData(days);
    const sales_data = dashboard_data.performance.sales;

    const timestamps = [];
    const values = [];

    for(const [k, v] of Object.entries(sales_data)) {
        timestamps.push(k);
        values.push(v);
    }

    initChartSell(timestamps, values);
}

const initDashboard=async()=>{
    initChartSell();
    const dashboard_data = await getDashboardData(7);
    gi('salesValue').innerText = dashboard_data.sales.total_orders;
    gi('ordersValue').innerText = toEuro(dashboard_data.sales.total_gain);
    gi('salesTrend').innerText = toGain(dashboard_data.sales.total_gain_last_days_percent);
    gi('ordersWeek').innerText = dashboard_data.sales.total_gain_last_days;

    gi('visualsValue').innerText = dashboard_data.visits.total_visits;

    gi('totalRefunds').innerText = dashboard_data.refunds.total_refunds;
    gi('refoundsValue').innerText = dashboard_data.refunds.total_refunds;
    gi('trendRefound').innerText = toGain(dashboard_data.refunds.total_refunds_last_days_percent);
    gi('refundsWeek').innerText = '+' + dashboard_data.refunds.total_refunds_last_days;
    
    
    changeSalesChart(0);
}

const initOrders=async()=>{
    const {showOrders} = await import("/src/js/dashboard/artisan/orders.js");
    showOrders();
}

const initOrder=async(idOrder)=>{
    const {showOrder} = await import("/src/js/dashboard/artisan/orders.js");
    showOrder(idOrder);
}

export const showErrorPopup=(errorText, backPage, backBtnText)=>{
    let overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.zIndex = 998;
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";

    let alertBox = document.createElement("div");
    alertBox.style.background = "#fff";
    alertBox.style.padding = "2rem";
    alertBox.style.borderRadius = "12px";
    alertBox.style.boxShadow = "0 4px 24px rgba(0,0,0,0.2)";
    alertBox.style.zIndex = 999;
    alertBox.style.maxWidth = "90vw";
    alertBox.style.textAlign = "center";
    alertBox.innerHTML = `
        <div style="font-size:1.2rem; margin-bottom:1rem;">${errorText}</div>
        <button id="goToOrdersBtn" style="padding:0.5rem 1.5rem; border:none; background:#007bff; color:#fff; font-size:1rem; cursor:pointer;" class="rounded-4">
            ${backBtnText}
        </button>
    `;

    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);

    document.getElementById("goToOrdersBtn").onclick = () => {
        document.body.removeChild(overlay);
        window.history.pushState({}, '', backPage);
        handlePageUrl({
            home: document.querySelector("#home"),
            ordini: document.querySelector("#orders"),
            ordine: document.querySelector("#order"),
            prodotti: document.querySelector("#products"),
            prodotto: document.querySelector("#product"),
            clienti: document.querySelector("#customers"),
            rimborsi: document.querySelector("#refounds")
        });
    };
}

const initCustomers=async()=>{
    let tbody=document.getElementById("customersTbContent");
    const req=await ajax("https://localhost:3000/purchases/customers");
    if(req.error!=null){
        tbody.innerHTML="<tr><td colspan='5'>Si è verificato un errore nel caricamento dei clienti</td></tr>";
        return;
    }
    if(req.length==0){
        tbody.innerHTML="<tr><td colspan='5'>Non è stato ancora effettuato alcun acquisto</td></tr>";
        return;
    }
    req.forEach(customer=>{
        let tr=document.createElement("tr");
        tr.innerHTML=`
            <td>${customer.name} ${customer.surname}</td>
            <td>${parseFloat(customer.amount_paid).toLocaleString('it-IT', {style: 'currency', currency: 'EUR'})}</td>
            <td>${customer.num_products}</td>
            <td>${customer.num_orders}</td>
            <td><a href='mailto:${customer.email}'>${customer.email}</a></td>
        `;
        tbody.appendChild(tr);
    });
}

const initRefounds=async()=>{

}

const loadReviews=async(page)=>{
    let cont=document.getElementById("listReviews");
    const request=await ajax(`https://localhost:3000/users/reviews/${window.artisanSlug}/${page}`);
    if(request.error!=null){
        cont.innerHTML="Si è verificato un errore nel caricamento delle recensioni";
    }
    cont.innerHTML="";
    Array.from(request.reviews).forEach(review=>{
        let rCont=document.createElememt("div");
        rCont.classList.add("review");
        //todo mettere nome reviewer quando api completa
        //let rName=
        let starsCont=document.createElement("div");
        let rating = review.rating || 0;
        let fullStars = Math.floor(rating);
        let halfStar = (rating - fullStars >= 0.5) ? 1 : 0;
        let emptyStars = 5 - fullStars - halfStar;

        for (let i = 0; i < fullStars; i++) {
            let star = document.createElement("span");
            star.innerHTML = "&#9733;"; // full star
            star.style.color = "#FFD700";
            starsCont.appendChild(star);
        }
        if (halfStar) {
            let star = document.createElement("span");
            star.innerHTML = "&#189;"; // half star (can use icon or custom svg)
            star.style.color = "#FFD700";
            starsCont.appendChild(star);
        }
        for (let i = 0; i < emptyStars; i++) {
            let star = document.createElement("span");
            star.innerHTML = "&#9734;"; // empty star
            star.style.color = "#FFD700";
            starsCont.appendChild(star);
        }
        rCont.appendChild(starsCont);
        let time=document.createElement("div");
        time.classList.add("text-muted");
        time.innerHTML = new Date(review.created_at).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        rCont.appendChild(time);
        let textReview = document.createElement("p");
        textReview.innerHTML=review.review_text;
        rCont.appendChild(textReview);
        cont.appendChild(rCont);
    });
    if(request.reviews.length==0||request.reviews==null){
        cont.innerHTML="Non hai ricevuto ancora nessuna recensione";
    }
}
const initReviews=async()=>{
    loadReviews(1);
}
const initProducts=async()=>{
    const {loadProducts, deleteProduct} = await import("/src/js/dashboard/artisan/products.js");
    let url=new URL(window.location.href);
    let page=1;
    if(url.hash!=""&&url.hash.search("pagina")){
        page = parseInt(url.hash.substring(url.hash.lastIndexOf("a")+1));
    }
    loadProducts(page);
    //TODO: listener cambio pagina, fare anche nel sito visibile al pubblico per artigiani e prodotti

    document.getElementById("btnToggleNewProd").addEventListener("click",(event)=>{
        event.preventDefault();
        window.history.pushState({}, '', "/artigiani/area-riservata/prodotti/nuovo");
        handlePageUrl({
            home: document.querySelector("#home"),
            ordini: document.querySelector("#orders"),
            ordine: document.querySelector("#order"),
            prodotti: document.querySelector("#products"),
            prodotto: document.querySelector("#product"),
            clienti: document.querySelector("#customers"),
            rimborsi: document.querySelector("#refounds"),
            recensioni: document.querySelector("#reviews")
        });
    });

    window.editProdToggle=async(slug)=>{
        window.history.pushState({}, '', `/artigiani/area-riservata/prodotti/${slug}`);
        handlePageUrl({
            home: document.querySelector("#home"),
            ordini: document.querySelector("#orders"),
            ordine: document.querySelector("#order"),
            prodotti: document.querySelector("#products"),
            prodotto: document.querySelector("#product"),
            clienti: document.querySelector("#customers"),
            rimborsi: document.querySelector("#refounds"),
            recensioni: document.querySelector("#reviews")
        });

    }
    window.deleteProdToggle=async(slug)=>{
        deleteProduct(slug);
        loadProducts(page);
    }
}

const initProduct=async(slugProduct=null)=>{
    const {loadCategories, uploadImage, addNewCategory, addNewQuantity, saveProduct, updateProduct, deleteFoto, preloadProductInfo} = await import("/src/js/dashboard/artisan/products.js");
    let btnAction=document.getElementById("btnActionProduct");
    if(slugProduct==null){
        //nuovo prodotto
        btnAction.onclick=()=>{
            saveProduct();
        }
        document.getElementById("pruductDisponibility").removeAttribute("disabled");
        document.getElementById("btnToggleProductRestock").disabled=true;
    }else{
        //modifica prodotto esistente
        btnAction.onclick=()=>{
            updateProduct(slugProduct);
        }
        document.getElementById("pruductDisponibility").disabled=true;
        document.getElementById("btnToggleProductRestock").removeAttribute('disabled');
        preloadProductInfo(slugProduct, window.artisanSlug);
    }
    loadCategories(slugProduct);
    document.querySelector(".selectImgBtn").addEventListener("click",(event)=>{
        event.preventDefault();
        document.getElementById("fotoInput").click();
    });

    document.getElementById("fotoInput").addEventListener("change",(event)=>{
        event.preventDefault();
        uploadImage();
    });

    //aggiunta categoria
    document.getElementById("btnAddCategory").addEventListener("click",async(event)=>{
        event.preventDefault();
        let categoryName=document.getElementById("newCatName").value;
        if(categoryName!=""){
            let res=await addNewCategory(categoryName, slugProduct);
            if(res){
                document.getElementById("resCatNew").innerHTML="La categoria è stata aggiunta con successo";
            }else{
                document.getElementById("resCatNew").innerHTML="Si è verificato un errore nell'aggiunta della categoria";
            }
        }
    });
    //aggiunta disponibilita
    document.getElementById("btnAddQuantity").addEventListener("click",async(event)=>{
        event.preventDefault();
        let quantity=document.getElementById("productQuantityAdd").value;
        if(quantity!=""){
            let res=await addNewQuantity(quantity, slugProduct);
            if(res){
                document.getElementById("resQuantityAdd").innerHTML="La disponibilità del prodotto è stata aggiornata con successo.";
            }else{
                document.getElementById("resQuantityAdd").innerHTML="Si è verificato un errore nell'aggiunta della disponibilità del prodotto.";
            }
        }
    });
    /*rimozione immagini*/
    document.getElementById("releaseTrashImg").addEventListener("dragover",(event)=>{
        event.preventDefault();
    });
    document.getElementById("releaseTrashImg").addEventListener("drop",(event)=>{
        event.preventDefault();
        let data=JSON.parse(event.dataTransfer.getData("application/json"));
        deleteFoto(data.idFoto, data.idProd);
    });
}

const showHidePage=(currentPage, allPages)=>{
    Object.entries(allPages).forEach(([key, element]) => {
        if (key === currentPage) {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
}

export const handlePageUrl=(pages)=>{
    let page=window.location.href.split('/').pop();
    let currentPage=page;
    let pageTitle=document.querySelector(".pageTitle");

    //caso speciale ordini e prodotti
    if (/^\/artigiani\/area-riservata\/ordini\/\d+$/.test(window.location.pathname)) {
        let idOrder=page.split('/').pop();
        initOrder(idOrder);
        currentPage = "ordine";
        pageTitle.innerText = `Ordine #${idOrder}`;
        document.querySelectorAll(".btnOrders").forEach(btn => {
            btn.classList.add("selected");
        });
        page = "ordine";
    } else if (/^\/artigiani\/area-riservata\/prodotti\/nuovo$/.test(window.location.pathname)) {
        initProduct(null);
        currentPage = "prodotto";
        pageTitle.innerText = "Nuovo prodotto";
        document.querySelectorAll(".btnProducts").forEach(btn => {
            btn.classList.add("selected");
        });
    }else if (/^\/artigiani\/area-riservata\/prodotti\/[^\/]+$/.test(window.location.pathname)) {
        let productSlug=page.split('/').pop();
        
        initProduct(productSlug);
        currentPage = "prodotto";
        pageTitle.innerText = "Modifica prodotto";
        document.querySelectorAll(".btnProducts").forEach(btn => {
            btn.classList.add("selected");
        });
        page = "prodotto";
    } else {

        if(page=="area-riservata"){
            initDashboard();
            currentPage="home";
            document.querySelectorAll(".btnHome").forEach(btn=>{
                btn.classList.add("selected");
            });
            //TODO: mettere il nome dell'artigiano nel titolo della pagina
        }else if(page=="ordini"){
            initOrders();
            pageTitle.innerText="I tuoi ordini";
            document.querySelectorAll(".btnOrders").forEach(btn=>{
                btn.classList.add("selected");
            });
        }else if(page=="ordine"){
        
        }else if(page=="rimborsi"){
            initRefounds();
            pageTitle.innerText="I tuoi rimborsi";
            /*document.querySelectorAll(".btnRefounds").forEach(btn=>{
                btn.classList.add("selected");
            });*/
        }else if(page=="clienti"){
            initCustomers();
            pageTitle.innerText="I tuoi clienti";
            document.querySelectorAll(".btnCustomers").forEach(btn=>{
                btn.classList.add("selected");
            });
        }else if(page=="prodotti"){
            initProducts();
            pageTitle.innerText="I tuoi prodotti";
            document.querySelectorAll(".btnProducts").forEach(btn=>{
                btn.classList.add("selected");
            });
        }else if(page=="prodotto"){
            initProduct();
            document.querySelectorAll(".btnProducts").forEach(btn=>{
                btn.classList.add("selected");
            });
        
        }else if(page=="recensioni"){
            initReviews();
            pageTitle.innerText="Le tue recensioni";
            document.querySelectorAll(".btnReviews").forEach(btn=>{
                btn.classList.add("selected");
            });
        }
    }
    showHidePage(currentPage, pages);
}

export const handleNavigation = (pages) => {
    const navigate = (path) => {
        window.history.pushState({}, '', path);
        handlePageUrl(pages);
    };
    const resetSelected=()=>{
        document.querySelectorAll(".navbarActions button").forEach(btn=>{
            btn.classList.remove("selected");
        });
        document.querySelectorAll(".navbarMobile button").forEach(btn=>{
            btn.classList.remove("selected");
        });
    }
   
    document.querySelectorAll(".btnHome").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            resetSelected();
            btn.classList.add("selected");
            navigate("/artigiani/area-riservata");
        });
    });
    document.querySelectorAll(".btnProducts").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            resetSelected();
            btn.classList.add("selected");
            navigate("/artigiani/area-riservata/prodotti");
        });
    });
    document.querySelectorAll(".btnOrders").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            resetSelected();
            btn.classList.add("selected");
            navigate("/artigiani/area-riservata/ordini");
        });
    });
    document.querySelectorAll(".btnCustomers").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            resetSelected();
            btn.classList.add("selected");
            navigate("/artigiani/area-riservata/clienti");
        });
    });
    document.querySelectorAll(".btnReviews").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            resetSelected();
            btn.classList.add("selected");
            navigate("/artigiani/area-riservata/recensioni");
        });
    });
};

export const getArtisanSlug=async()=>{
    return new Promise(async(resolve, reject)=>{
        const request=await ajax("https://localhost:3000/users/userSlug");
        if(request.error!=null)
            reject(request.error);
        resolve(request.slug);
    });    
}