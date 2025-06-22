import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {getArtisanSlug} from "/src/js/dashboard/artisan/index.js";
import {loadImage} from "/src/js/dashboard/index.js";

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
        requestProducts.products.forEach(product=>{
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
        makePagination(page, requestProducts.pages);

    }catch(err){
        console.error(err);
        let errTxt="Si è verificato un errore durante il caricamento dei prodotti";
        if(err.message=="Unauthorized"){
            errTxt="Per visualizzare i prodotti è necessario effettuare il login";
        }
        tbody.innerHTML=`<tr><td colspan='7'>${errTxt}</td></tr>`;
    }

}

export const loadCategories=async(productSlug=null)=>{
    let cont=document.getElementById("categoryList");
    const req=await ajax("https://localhost:3000/products/categories"+(productSlug!=null ? "?product_slug="+productSlug: ""));
    if(req.error!=null){
        cont.innerHTML="Si è verificato un errore nel caricamento delle categorie";
    }
    cont.innerHTML="";
    req.categories.forEach((category, i)=>{
        let r=document.createElement("div");
        r.classList.add("form-check");
        r.innerHTML=`<input class='form-check-input' type='checkbox' name='productCategory' id='cat${i}' data-slug='${category.slug}' ${category.selected ? "checked" : ""}>
        <label class='form-check-label' for='cat${i}'>${category.name}</label>`;
        cont.appendChild(r);
    });
}

export const preloadProductInfo=async(slug, artisanSlug)=>{
    const req=await ajax(`https://localhost:3000/products/product/${artisanSlug}/${slug}`);
    if(req.error!=null){

    }
    document.getElementById("productName").value=req.name;
    document.getElementById("productPrice").value=req.price;
    document.getElementById("productShortDescription").value=req.short_description;
    document.getElementById("productDescription").value=req.description;
    req.images.forEach(img=>{
        let imgEl=document.createElement("img");
        imgEl.classList.add("lazyImages");
        imgEl.dataset.src=img;
        loadImage(imgEl);
        document.getElementById("imgProdUploaded").appendChild(imgEl);
    });
    initDragAndDrop(document.getElementById("imgProdUploaded"),swapFoto);
}

const deleteProduct=async(slugProduct)=>{
    if(confirm("Sei sicuro di voler cancellare definitivamente il prodotto?")){
        const request=await ajax("https://localhost/products/"+slugProduct,{
            method:"DELETE"
        });
        if(request.error==null){
            alert("Si è verificato un errore nell'eliminazione del prodotto. Riprova");
        }else{
            window.history.pushState({}, '', "/artigiani/area-riservata/prodotti");
            handlePageUrl
        }
    }
}

let draggedItem = null;

const swapFoto=async(id, pos, idProd)=>{
    const request=await ajax(`https://localhost:3000/products/productImage/changePosition`,{
        method:"POST",
        headers: {
            "Content-Type": "application/json"
        },
        body:JSON.stringify({
            product_id:idProd,
            image_id:id,
            new_position:pos
        })
    });
    if(request.error!=null){
        alert("Si è verificato un errore nell'aggiornamento dell'ordine");
        console.error(request.error);
        return;
    }

}
const deleteFoto=async(id, idProd)=>{
    const request=await ajax(`https://localhost:3000/products/productImage/${idProd}/${id}`,{
        method:"DELETE"
    });
    if(request.error!=null){
        alert("Si è verificato un errore nell'eliminazione della foto");
        console.error(request.error);
        return;
    }
    let images=document.querySelector(".productImgCont .list-item");
    //cerco quella con quell'id
    images.forEach(img=>{
        if(img.dataset.id==id){
            img.remove();
        }
    });
}

function initDragAndDrop(list, swapFunction) {
    Array.from(list.children).forEach(item => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', (event) => {
            event.stopPropagation();
            if (event.target && event.target.classList.contains('list-item')) {
                draggedItem = event.target;
                event.target.style.opacity = '0.5';
            }
            event.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', (event) => {
            event.stopPropagation();
            if (event.target && event.target.classList.contains('list-item')) {
                event.target.style.opacity = '1';
            }
        });
        
        item.addEventListener('dragover', (event) => {
            event.preventDefault(); // Necessario per consentire il drop
            event.stopPropagation();
            const target = event.target;
            if (target && target !== draggedItem && target.classList.contains('list-item')) {
                target.classList.add('drag-over');
                event.dataTransfer.dropEffect = 'move';
            }
        });
        
        item.addEventListener('dragleave', (event) => {
            event.stopPropagation();
            const target = event.target;
            if (target && target.classList.contains('list-item')) {
            target.classList.remove('drag-over');
            }
        });
        
        item.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const target = event.target;
            if (target && target !== draggedItem && target.classList.contains('list-item')) {
                target.classList.remove('drag-over');
                
                const draggedIndex = Array.from(list.children).indexOf(draggedItem);
                const targetIndex = Array.from(list.children).indexOf(target);
                console.log(draggedIndex, targetIndex);
                let id=draggedItem.dataset.id;
                if (draggedIndex > targetIndex) {
                    list.insertBefore(draggedItem, target);
                } else {
                    list.insertBefore(draggedItem, target.nextSibling);
                }
                swapFunction(id, targetIndex);
            }
        });
    });
}
