import {ajax} from "/src/js/modules/fetchWorkerModule.js";


let chart;
const initChartSell = async () => {
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

    let data = [];
    let labels = [];
    let values = [];
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


const initDashboard=async()=>{
    initChartSell();
    //TODO: impostare i dati nella pagina ottenuti dall'api
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

}

const initRefounds=async()=>{

}
const initProducts=async()=>{
    const {loadProducts} = await import("/src/js/dashboard/artisan/products.js");
    let url=new URL(window.location.href);
    let page=1;
    if(url.hash!=""&&url.hash.search("pagina")){
        page = parseInt(url.hash.substring(url.hash.lastIndexOf("a")+1));
    }
    loadProducts(page);
    //TODO: listener cambio pagina, fare anche nel sito visibile al pubblico per artigiani e prodotti
}

const initProduct=async(idOrder)=>{

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
    } else if (/^\/artigiani\/area-riservata\/prodotti\/\d+$/.test(window.location.pathname)) {
        let idProduct=page.split('/').pop();
        initProduct(idProduct);
        currentPage = "prodotto";
        pageTitle.innerText = "Dettaglio prodotto";
        document.querySelectorAll(".btnProducts").forEach(btn => {
            btn.classList.add("selected");
        });
        page = "prodotto";
    }else{

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
};

export const getArtisanSlug=async()=>{
    return new Promise(async(resolve, reject)=>{
        const request=await ajax("https://localhost:3000/users/userSlug");
        if(request.error!=null)
            reject(request.error);
        resolve(request.slug);
    });    
}