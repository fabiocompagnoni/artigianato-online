export const initProductQuantitySelectors=()=>{
    const selectors=document.querySelectorAll(".customQuantitySelector");
    selectors.forEach(selector=>{
        let btnMinus=selector.querySelector(".removeOne");
        let btnPlus=selector.querySelector(".addOne");
        let input=selector.querySelector(".quantityShow");

        btnMinus.addEventListener("click",()=>{
            let v=input.value;
            if(v>1){
                v--;
                input.value=v;
            }else{
                btnMinus.disabled=true;
            }
        });
        btnPlus.addEventListener("click",()=>{
            let v=input.value;
            v++;
            input.value=v;
            if(btnMinus.hasAttribute("disabled")){
                btnMinus.removeAttribute("disabled");
            }
        });
    });
}