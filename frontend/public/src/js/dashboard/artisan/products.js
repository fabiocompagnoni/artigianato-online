import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {getArtisanSlug} from "/src/js/dashboard/artisan/index.js";

const makePagination=(currentPage, pages)=>{
    let pagination=document.getElementById("paginationProducts");
    pagination.innerHTML="";
    for(let i=1;i<=pages;i++){
        let pg=document.createElement("a");
        pg.href="#pagina"+i;
        if(i==currentPage)
            pg.classList.add("selected");
        pg.innerHTML=i;
        pagination.appendChild(pg);
    }

}
export const loadProducts=async(page)=>{
    let tbody=document.getElementById("productsTbContent");
    try{
        const userSlug=await getArtisanSlug();
        const requestProducts=await ajax(`https://localhost:3000/products/${page}?filter.artisan=${userSlug}`);
        if(requestProducts.error!=null){
            throw new Error(requestProducts.error);
        }
        requestProducts.forEach(product=>{
            let tr=document.createElement("tr");
            let categoriesString=product.categories.join(", ");
            tr.innerHTML=`
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td><span class='badge text-bg-${product.quantity>0?"success":"danger"}'>${product.quantity}</span></td>
                <td>${categoriesString}</td>
                <td>${parseFloat(product.price).toLocaleString('it-IT', {style: 'currency', currency: 'EUR'})}</td>
                <td>${product.visits}</td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-outline-secondary rounded-4 dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><button class='dropdown-item' onclick='window.editProdToggle(${product.id})'><i class="fas fa-edit"></i> Modifica</button></li>
                            <li><button class='dropdown-item' onclick='window.deleteProdToggle(${product.id})'><i class="fas fa-trash"></i> Elimina</button></li>
                            <li><a href='${product.link}' class='dropdown-item' target='_blank'><i class="fas fa-eye"></i>Visualizza</a></li>
                        </ul>
                    </div>
                </td>

            `;

        });
    }catch(err){
        console.error(err);
        let errTxt="Si è verificato un errore durante il caricamento dei prodotti";
        if(err.message=="Unauthorized"){
            errTxt="Per visualizzare i prodotti è necessario effettuare il login";
        }
        tbody.innerHTML=`<tr><td colspan='7'>${errTxt}</td></tr>`;
    }

}