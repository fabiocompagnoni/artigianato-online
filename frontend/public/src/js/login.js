import { ajax } from "/src/js/modules/fetchWorkerModule.js";


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
            let reqLink=await ajax("https://localhost:3000/users/dashboardPage");
            if(reqLink.dashboardLink!=null)
                urlDashboard=reqLink.dashboardLink;
            else
                throw new Error("Dashboard link not found");
            window.location.href=urlDashboard;
        }

    }catch(err){
        console.error(err);
    }
    
}

const toggleShowPassword=(input, btn)=>{
    if(input.type==="password"){
        input.type="text";
        btn.innerHTML=`<i class="fas fa-eye-slash"></i>`
    }else{
        input.type="password";
        btn.innerHTML=`<i class="fas fa-eye"></i>`
    }
}

const register=async()=>{
    let email=document.getElementById("emailRegister").value;
    let password=document.getElementById("passwordRegister").value;
    let confirmPassword=document.getElementById("passwordConfirm").value;
    let nome=document.getElementById("name").value;
    let cognome=document.getElementById("surname").value;
    let type=document.getElementById("userType").value;

    let passed=true;
    //validazione dei campi
    if(email=="" || password=="" || confirmPassword=="" || nome=="" || cognome==""){
        let errorPart=document.getElementById("errorPart");
        errorPart.innerHTML="Inserisci tutti i campi richiesti";
        errorPart.style.display="block";
        errorPart.classList.add("text-danger");
        return;
    }
    let regexEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!regexEmail.test(email)){
        passed=false;
        document.getElementById("emailRegister").classList.add("is-invalid");
    }else{
        document.getElementById("emailRegister").classList.remove("is-invalid");
    }
    let regexPassword=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\s\S]{8,32}$/;
    if(!regexPassword.test(password)){
        passed=false;
        document.getElementById("passwordRegister").classList.add("is-invalid");
    }else{
        document.getElementById("passwordRegister").classList.remove("is-invalid");
    }
    if(password!==confirmPassword){
        passed=false;
        document.getElementById("passwordConfirm").classList.add("is-invalid");
    } else{
        document.getElementById("passwordConfirm").classList.remove("is-invalid");
    }
    let regexName=/^[\p{L}\s'-]+([\p{L}\s'-]*[\p{L}\s'-]+)*$/u;
    if(!regexName.test(nome)){
        passed=false;
        document.getElementById("name").classList.add("is-invalid");
    }else{
        document.getElementById("name").classList.remove("is-invalid");
    }
    if(!regexName.test(cognome)){
        passed=false;
        document.getElementById("surname").classList.add("is-invalid");
    }else{
        document.getElementById("surname").classList.remove("is-invalid");
    }
    if(!passed){
        return;
    }

    document.getElementById("step1").style.display="none";
    document.getElementById("step2").style.display="flex";
    document.getElementById("step2").innerHTML=`<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>`;
    
    let errorPart=document.getElementById("errorPart");
    errorPart.innerHTML="";
    errorPart.style.display="none";
    let parsedType=(type==1)?"customer":"artisan";
    try{
        const request=await ajax("https://localhost:3000/users/user","POST",{
            email:email,
            password:password,
            name:nome,
            surname:cognome,
            type:parsedType
        },{
            "Content-Type": "application/json"
        });
        let content=`<h3 class="text-center">Registrazione completata</h3>
            <p class="text-center">Ora puoi effettuare il login</p>
            <a class="btn btn-primary rounded-4" href="/accedi">Accedi</a>`;
        
        document.getElementById("step2").innerHTML=content;
        
    }catch(err){
        let errorMessage=err ?? "Si è verificato un errore durante la registrazione";
        content=`<div class='d-flex flex-column gap-2 w-100'>
            <p>${errorMessage}.<br/>Riprova più tardi.</p>
            <div class="text-end my-3">
                <a class="btn btn-primary rounded-4" href="">Riprova</a>
                
            </div>
        </div>`;
        document.getElementById("step2").innerHTML=content;
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded",()=>{
    if(document.getElementById("showPsw")!=null)
        document.getElementById("showPsw").addEventListener("click",(event)=>{toggleShowPassword(document.getElementById("password"), document.getElementById("showPsw"));});
    if(document.getElementById("showPsw1")!=null)
        document.getElementById("showPsw1").addEventListener("click",(event)=>{toggleShowPassword(document.getElementById("passwordRegister"), document.getElementById("showPsw1"));});
    if(document.getElementById("showPsw2")!=null)
        document.getElementById("showPsw2").addEventListener("click",(event)=>{toggleShowPassword(document.getElementById("passwordConfirm"), document.getElementById("showPsw2"));});
    if(document.getElementById("loginButton") != null)
        document.getElementById("loginButton").addEventListener("click",makeLogin);
    if(document.getElementById("registerButton") != null)
        document.getElementById("registerButton").addEventListener("click",register);
});