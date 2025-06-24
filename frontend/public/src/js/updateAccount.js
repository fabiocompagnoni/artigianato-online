document.querySelector('#btnSubmit').addEventListener('click', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    const data = {};
    if (name) data.name = name;
    if (surname) data.surname = surname;
    if (email) data.email = email;
    if (password) data.password = password;

    if (Object.keys(data).length === 0) {
        alert('Nessun campo aggiornato.');
        return;
    }

    try {
        const response = await fetch('/users/user', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials:'include',
            body: JSON.stringify(data)
        });
        if(response.status==401){
            alert("Per modificare le informazioni del tuo account prima devi aver fatto l'accesso");
        }
        else if(response.status!=200){
            alert("Si è verificato un errore durante l'aggiornamento delle informazioni del tuo account");
        }else{
            alert("Informazioni aggiornate con successo!");
        }
        
    } catch (err) {
        alert('Errore di rete. Riprova più tardi.');
    }
});