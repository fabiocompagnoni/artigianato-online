const makeLogin=async()=>{
    let email=document.getElementById("emailLogin").value;
    let password=document.getElementById("password").value;
    document.getElementById("inputPart").style.display="none";
    document.getElementById("loadingPart").style.display="flex";

    let errorPart=document.getElementById("errorPart");
    errorPart.innerHTML="";
    errorPart.style.display="none";
    
    try{
        const request=await fetch("https://localhost:3000/users/login",{
            method:"POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body:JSON.stringify({
                email:email,
                password:password
            })
        });

        let response=await request.json();
        if(request.status!=200){
            errorPart.innerHTML=response.error;
            errorPart.style.display="block";
            errorPart.classList.add("text-danger");
            document.getElementById("loadingPart").style.display="none";
            document.getElementById("inputPart").style.display="block";
            return;
        }else{
            
            let urlDashboard="";
            if(response.role=="admin"){
                urlDashboard="/admin/area-riservata";
            }else if(response.role=="customer"){
                urlDashboard="/clienti/area-riservata";
            }else if(response.role=="artisan"){
                urlDashboard="/artigiani/area-riservata";
            }
            window.location.href=urlDashboard;
        }

    }catch(err){
        console.error(err);
    }
    
}

const toggleShowPassword=()=>{
    let input=document.getElementById("password");
    let btn=document.getElementById("showPsw");
    if(input.type==="password"){
        input.type="text";
        btn.innerHTML=`<i class="fas fa-eye-slash"></i>`
    }else{
        input.type="password";
        btn.innerHTML=`<i class="fas fa-eye"></i>`
    }
}

document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("showPsw").addEventListener("click",toggleShowPassword);
    document.getElementById("loginButton").addEventListener("click",makeLogin);
});