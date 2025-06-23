import {ajax} from "/src/js/modules/fetchWorkerModule.js";
import {getArtisanSlug} from "/src/js/dashboard/artisan/index.js";
import {loadImage} from "/src/js/modules/loadImageModule.js";


let selectedCategories=[];
let selectedImages=[];

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

    document.querySelectorAll("[productCategory]").forEach(checkbox=>{
        checkbox.addEventListener("change",(event)=>{
            if(checkbox.checked){
                addCategory(checkbox.dataset.slug);
            }else{
                removeCategory(checkbox.dataset.slug);
            }
        });
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
        imgEl.classList.add("lazyImages", "line-items");
        imgEl.dataset.src=img.url;
        imgEl.dataset.id=img.id;
        addListenerDelete(img.id, req.id, imgEl);
        loadImage(imgEl);
        document.getElementById("imgProdUploaded").appendChild(imgEl);
        selectedImages.push(img.id);
    });
    initDragAndDrop(document.getElementById("imgProdUploaded"),swapFoto);
}

let animationFrameId;
const updateProgressTime = () => {
    let startTime = performance.now();
    let duration = 3000;
    let pg = document.querySelector("#progress #active");
    
    const animate = (currentTime) => {
        let elapsed = currentTime - startTime;
        let progress = Math.max(0, 100 - (elapsed / duration * 100));
        
        pg.style.width = progress + "%";
        
        if (progress > 0) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            document.getElementById("updates").style.display = "none";
        }
    };
    
    animationFrameId = requestAnimationFrame(animate);
}
const showUpdate=(success, message=null)=>{
    document.getElementById("updates").style.display="flex";
    document.getElementById("active").style.backgroundColor=`var(${(success)?"--bs-success":"--bs-danger"})`;
    document.getElementById("textContent").innerHTML=message ?? "Prodotto aggiornato";
    updateProgressTime();
}


export const deleteProduct=async(slugProduct)=>{
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

const getProductInfo=()=>{
    return {
        name: document.getElementById("productName").value,
        description: document.getElementById("productDescription").value,
        short_description: document.getElementById("productShortDescription").value,
        price: document.getElementById("productPrice").value,
        categories:selectedCategories,
        images: selectedImages
    };
}

export const uploadImage=async()=>{
    let input=document.getElementById("fotoInput");
    if (input.files && input.files.length > 0) {
        const files = Array.from(input.files);
        for (const file of files) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('https://localhost:3000/images/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.file_id) {
                    selectedImages.push(data.file_id);
                    // Mostra l'immagine caricata nell'interfaccia
                    let imgEl = document.createElement("img");
                    imgEl.classList.add("lazyImages", "list-item");
                    imgEl.dataset.id = data.file_id;
                    imgEl.src = URL.createObjectURL(file);
                    selectedImages.push(data.file_id);
                    addListenerDelete(data.file_id, null, imgEl);
                    document.getElementById("imgProdUploaded").appendChild(imgEl);
                    initDragAndDrop(document.getElementById("imgProdUploaded"),swapFoto);
                } else {
                    alert("Errore durante il caricamento dell'immagine");
                }
            } catch (err) {
                alert("Errore durante il caricamento dell'immagine");
                console.error(err);
            }
        }
        input.value = "";
    }
}

export const updateProduct=async(slug)=>{
    const request=await ajax("https://localhost:3000/products/product/"+slug,
        "PUT",
        getProductInfo(),
    );
    if(request.error!=null){
        showUpdate(false, "Si è verificato un problema nell'aggiornamento del prodotto");
        console.log(request.error);
        return;
    }
    showUpdate(success, "Prodotto aggiornato con successo");
}

export const addCategory=async(slug)=>{
    if(!selectedCategories.includes(slug)){
        selectedCategories.push(slug);
    }
}
export const removeCategory=async(slug)=>{
    let index=selectedCategories.indexOf(slug);
    if(index!=-1){
        selectedCategories.splice(index, 1);
    }
}
export const saveProduct=async()=>{
    const request=await ajax("https://localhost:3000/products/product",
        "POST",
        getProductInfo(),
    );
    if(request.error!=null){
        showUpdate(false, "Si è verificato un problema nell'inserimento del prodotto");
        console.log(request.error);
        return;
    }
    let slug=request.slug;
    window.history.pushState({}, '', `/artigiani/area-riservata/prodotti/${slug}`);
    showUpdate(true, "Prodotto caricato con successo!");

    document.getElementById("btnActionProduct").onclick=()=>{
        updateProduct(slug);
    }
}

export const addNewCategory=async(name, productSlug=null)=>{
    const request=await ajax("https://localhost:3000/products/category","POST",{name:name});
    if(request.error!=null){
        console.error(request.error);
        return false;
    }
    loadCategories(productSlug);
    return true;
}

export const addNewQuantity=async(quantity, slugProd)=>{
    const req=await ajax("https://localhost:3000/products/restock/"+slugProd,"POST",{quantity:quantity});
    if(req.error!=null){
        console.error(req.error);
        return false;
    }
    if(req.quantity!=null){
        document.getElementById("pruductDisponibility").value=req.quantity;
    }
    return true;
}

let draggedItem = null;

const swapFoto=async(id, pos, idProd)=>{
    const request=await ajax(`https://localhost:3000/products/productImage/changePosition`,
        "POST",
        {
            product_id:idProd,
            image_id:id,
            new_position:pos
        }
    );
    if(request.error!=null){
        alert("Si è verificato un errore nell'aggiornamento dell'ordine");
        console.error(request.error);
        return;
    }

}

const addListenerDelete=(idFoto, idProd, imgElement)=>{
    imgElement.addEventListener("dragstart",(event)=>{
        event.dataTransfer.clearData();
        event.dataTransfer.setData("application/json",JSON.stringify({
            idFoto:idFoto,
            idProd:idProd
        }));
    })
}

export const deleteFoto=async(id, idProd)=>{
    const request=await ajax(`https://localhost:3000/products/productImage/${idProd}/${id}`,"DELETE");
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
