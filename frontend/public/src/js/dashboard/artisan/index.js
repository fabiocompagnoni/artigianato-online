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

    let chart = new Chart(document.getElementById("salesChart"), {
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

}

const initOrder=async()=>{

}

const initCustomers=async()=>{

}

const initRefounds=async()=>{

}
const initProducts=async()=>{

}

const initProduct=async()=>{

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
    if(page=="area-riservata"){
        initDashboard();
        currentPage="home";
        //TODO: mettere il nome dell'artigiano nel titolo della pagina
    }else if(page=="ordini"){
        initOrders();
        pageTitle.innerText="I tuoi ordini";
    }else if(page=="rimborsi"){
        initRefounds();
        pageTitle.innerText="I tuoi rimborsi";
    }else if(page=="clienti"){
        initCustomers();
        pageTitle.innerText="I tuoi clienti";
    }else if(page=="prodotti"){
        initProducts();
        pageTitle.innerText="I tuoi prodotti";
    }else if(page=="prodotto"){
        initProduct();
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