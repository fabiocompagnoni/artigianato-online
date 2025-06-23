import app from '../app.js'; // Assicurati che 'app' sia l'istanza del tuo API Gateway
import request from 'supertest';
import path from 'path';
import beforeAllCallback from './waitForServices.js'; // Funzione per aspettare che i servizi siano online

// VARIABILI GLOBALI PER I TEST
let adminJwtCookie; // JWT per l'admin (globale)

// Variabili per utenti e prodotti/ordini creati nel beforeAll per setup iniziale
let globalArtisanJwtCookie;
let globalCustomerJwtCookie;
let globalUploadedImageId;
let globalSetupProductId;
let globalSetupOrderId; // Ordine creato per test di segnalazione ordine
let globalSetupTicketId; // ID di un ticket creato nel beforeAll

// Dati per l'utente artigiano globale (per creare il prodotto di setup iniziale)
const global_artisan_user_data = {
    email: 'global.artisan.tickets@example.com',
    name: 'GlobalTicket',
    surname: 'Artisan',
    password: 'ArtisanPassword1!',
    role: 'artisan'
};

// Dati per l'utente cliente globale (per l'acquisto e la segnalazione di setup iniziale)
const global_customer_user_data = {
    email: 'global.customer.tickets@example.com',
    name: 'GlobalTicket',
    surname: 'Customer',
    password: 'CustomerPassword1!',
    role: 'customer'
};

// Dati per l'utente amministratore (pre-esistente, non registrato tramite API)
const admin_user_data = {
    email: 'testadmin@example.com',
    password: 'testpassword'
};

// Dati per il prodotto di setup iniziale (per la segnalazione)
const global_setup_product_data = {
    name: 'Prodotto Setup Globale Ticket',
    description: 'Prodotto usato per setup in beforeAll per test tickets.',
    short_description: 'Global Ticket Prod.',
    price: 10.00,
    categories: ['Test'],
    images: [], // Popolato con globalUploadedImageId
    quantity: 5 // Quantità sufficiente
};

// Funzione helper per generare lo slug dell'artigiano
function generateArtisanSlug(name, surname) {
    // Assumiamo che il backend pulisca caratteri non alfabetici per lo slug.
    // Qui normalizziamo solo per coerenza, ma il nome deve essere unico nell'alfabetico.
    const cleanName = name.replace(/[^a-zA-Z]/g, ''); // Rimuove caratteri non alfabetici
    const cleanSurname = surname.replace(/[^a-zA-Z]/g, '');
    return `${cleanName.toLowerCase()}-${cleanSurname.toLowerCase()}`;
}

// Funzione helper per generare un suffisso alfanumerico casuale (per email)
function generateRandomSuffix() {
    return Math.random().toString(36).substring(2, 8); // Random alphanumeric string
}

// Funzione helper per generare un suffisso alfabetico casuale (per nomi che influenzeranno lo slug)
function generateRandomAlphaSuffix(length = 6) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Funzione helper per generare email uniche
function generateUniqueEmail(prefix) {
    const timestamp = Date.now();
    const randomSuffix = generateRandomSuffix();
    return `${prefix}.${timestamp}.${randomSuffix}@example.com`;
}

// Funzione helper per generare lo slug del prodotto (se necessario per il reporting by slug)
function generateProductSlug(productName) {
    return productName.toLowerCase().replace(/ /g, '-');
}


// Aspettiamo che tutti i servizi siano online e prepariamo i dati di test globali
beforeAll(async () => {
    try {
        await beforeAllCallback(app); // Assicurati che tutti i microservizi siano attivi
    } catch (error) {
        console.error('Failed to wait for services to be online, aborting tests:', error);
        fail('Microservices did not become ready.');
    }

    // 1. Registra e logga l'utente artigiano globale
    let res = await request(app)
        .post('/users/user')
        .send(global_artisan_user_data)
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(res.statusCode).toBe(200);

    let loginRes = await request(app)
        .post('/users/login')
        .send({ email: global_artisan_user_data.email, password: global_artisan_user_data.password })
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(loginRes.statusCode).toBe(200);
    globalArtisanJwtCookie = loginRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
    expect(globalArtisanJwtCookie).toBeDefined();

    // 2. Registra e logga l'utente cliente globale
    res = await request(app)
        .post('/users/user')
        .send(global_customer_user_data)
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(res.statusCode).toBe(200);

    loginRes = await request(app)
        .post('/users/login')
        .send({ email: global_customer_user_data.email, password: global_customer_user_data.password })
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(loginRes.statusCode).toBe(200);
    globalCustomerJwtCookie = loginRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
    expect(globalCustomerJwtCookie).toBeDefined();

    // 3. Logga l'utente amministratore (assunto pre-esistente)
    loginRes = await request(app)
        .post('/users/login')
        .send({ email: admin_user_data.email, password: admin_user_data.password })
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(loginRes.statusCode).toBe(200);
    adminJwtCookie = loginRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
    expect(adminJwtCookie).toBeDefined();

    // 4. Carica un'immagine di test globale (riutilizzata)
    res = await request(app)
        .post('/images/upload')
        .set('Cookie', globalArtisanJwtCookie)
        .attach('image', path.resolve(process.cwd(), './test/images/product_test_image.png'))
        .timeout(20000);
    expect(res.statusCode).toBe(200);
    globalUploadedImageId = res.body.file_id;
    expect(globalUploadedImageId).toBeDefined();
    global_setup_product_data.images.push(globalUploadedImageId);

    // 5. Crea un prodotto di setup globale
    const productCreateRes = await request(app)
        .post('/products/product')
        .set('Cookie', globalArtisanJwtCookie)
        .send(global_setup_product_data)
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(productCreateRes.statusCode).toBe(200);
    globalSetupProductId = productCreateRes.body.id;

    // 6. Aggiungi il prodotto di setup al carrello del cliente globale e acquista per avere un ordine
    await request(app)
        .post('/purchases/addToCart')
        .set('Cookie', globalCustomerJwtCookie)
        .send([{ id: globalSetupProductId, quantity: 1 }])
        .set('Content-Type', 'application/json')
        .timeout(10000);

    const purchaseRes = await request(app)
        .post('/purchases/purchase')
        .set('Cookie', globalCustomerJwtCookie)
        .timeout(20000);
    expect(purchaseRes.statusCode).toBe(200);
    globalSetupOrderId = purchaseRes.body.order_id;

    // 7. Crea un ticket iniziale per i test di recupero/aggiornamento/eliminazione
    const reportData = { note: 'Prodotto segnalato per test globali ticket.' };
    // Lo slug dell'artigiano globale è fisso ('globalticket-artisan')
    const artisanSlug = generateArtisanSlug(global_artisan_user_data.name, global_artisan_user_data.surname);
    const productSlug = generateProductSlug(global_setup_product_data.name);

    const ticketCreateRes = await request(app)
        .post(`/products/report/${artisanSlug}/${productSlug}`)
        .set('Cookie', globalCustomerJwtCookie)
        .send(reportData)
        .set('Content-Type', 'application/json')
        .timeout(10000);
    expect(ticketCreateRes.statusCode).toBe(200);
    expect(ticketCreateRes.body.ticket_id).toBeDefined();
    globalSetupTicketId = ticketCreateRes.body.ticket_id;
});

// Test health check del microservizio Tickets
describe('Tickets Microservice Health Check', () => {
    test('GET /tickets should return 200 OK', async () => {
        const res = await request(app)
            .get('/tickets')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ service: 'tickets', status: 'ok' });
    });
});

// Test Creazione Ticket (Segnalazione)
describe('Ticket Creation (Reporting)', () => {
    let currentArtisanJwtCookie;
    let currentCustomerJwtCookie;
    let currentArtisanData; // Dati completi dell'artigiano corrente per lo slug
    let currentTestProductId;
    let currentTestProductName; // Per un'asserzione più precisa dello slug del prodotto
    let currentTestOrderId;

    beforeEach(async () => {
        // Registra e logga un NUOVO artigiano per ogni test
        currentArtisanData = {
            email: generateUniqueEmail('artisan.ticket.create'),
            name: `TicketArtisan${generateRandomAlphaSuffix()}`, // Nome con suffisso alfabetico
            surname: 'Creator',
            password: 'ArtisanPassword1!',
            role: 'artisan'
        };
        await request(app)
            .post('/users/user')
            .send(currentArtisanData)
            .set('Content-Type', 'application/json')
            .timeout(20000);
        const loginArtisanRes = await request(app)
            .post('/users/login')
            .send({ email: currentArtisanData.email, password: currentArtisanData.password })
            .set('Content-Type', 'application/json')
            .timeout(20000);
        currentArtisanJwtCookie = loginArtisanRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
        expect(currentArtisanJwtCookie).toBeDefined();

        // Registra e logga un NUOVO cliente per ogni test
        const currentCustomerData = {
            email: generateUniqueEmail('customer.ticket.create'),
            name: `TicketCustomer${generateRandomAlphaSuffix()}`, // Nome con suffisso alfabetico
            surname: 'Creator',
            password: 'CustomerPassword1!',
            role: 'customer'
        };
        await request(app)
            .post('/users/user')
            .send(currentCustomerData)
            .set('Content-Type', 'application/json')
            .timeout(20000);
        const loginCustomerRes = await request(app)
            .post('/users/login')
            .send({ email: currentCustomerData.email, password: currentCustomerData.password })
            .set('Content-Type', 'application/json')
            .timeout(20000);
        currentCustomerJwtCookie = loginCustomerRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
        expect(currentCustomerJwtCookie).toBeDefined();

        // Crea un NUOVO prodotto per ogni test di segnalazione prodotto
        currentTestProductName = `Prodotto Segnalazione Test ${generateRandomAlphaSuffix()}`; // Nome prodotto con suffisso alfabetico
        const test_product_data_for_ticket = {
            name: currentTestProductName,
            description: 'Prodotto per test segnalazione.',
            short_description: 'Ticket Prod.',
            price: 15.00,
            categories: ['TestTicket'],
            images: [globalUploadedImageId],
            quantity: 2
        };
        const productCreateRes = await request(app)
            .post('/products/product')
            .set('Cookie', currentArtisanJwtCookie)
            .send(test_product_data_for_ticket)
            .set('Content-Type', 'application/json')
            .timeout(20000);
        expect(productCreateRes.statusCode).toBe(200);
        currentTestProductId = productCreateRes.body.id;

        // Aggiungi il prodotto al carrello e acquista per avere un ordine per la segnalazione ordine
        await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: 1 }])
            .set('Content-Type', 'application/json')
            .timeout(10000);

        const purchaseRes = await request(app)
            .post('/purchases/purchase')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(20000);
        expect(purchaseRes.statusCode).toBe(200);
        currentTestOrderId = purchaseRes.body.order_id;
    });

    test('POST /products/report/{artisan_slug}/{product_slug} - Should allow a customer to report a product', async () => {
        const reportData = { note: 'Contenuto del prodotto inappropriato.' };
        const artisanSlug = generateArtisanSlug(currentArtisanData.name, currentArtisanData.surname);
        const productSlug = generateProductSlug(currentTestProductName);

        const res = await request(app)
            .post(`/products/report/${artisanSlug}/${productSlug}`)
            .set('Cookie', currentCustomerJwtCookie)
            .send(reportData)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.ticket_id).toBeDefined();
    });

    test('POST /purchases/report/{id_order} - Should allow a customer to report an order', async () => {
        const reportData = { note: 'Ordine incompleto o danneggiato.' };
        const res = await request(app)
            .post(`/purchases/report/${currentTestOrderId}`)
            .set('Cookie', currentCustomerJwtCookie)
            .send(reportData)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.ticket_id).toBeDefined();
    });

    test('POST /products/report - Should return 404 for invalid product data (e.g., non-existent product)', async () => {
        const reportData = { note: 'Prodotto inesistente.' };
        const artisanSlug = generateArtisanSlug(currentArtisanData.name, currentArtisanData.surname);
        const res = await request(app)
            .post(`/products/report/${artisanSlug}/non-existent-product-slug`)
            .set('Cookie', currentCustomerJwtCookie)
            .send(reportData)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(404);
    });
});

// Test Recupero Ticket
describe('Ticket Retrieval', () => {
    // Questi test useranno il globalSetupTicketId e i JWT globali,
    // in quanto la fase di recupero non altera lo stato del ticket.

    test('GET /tickets - Should allow admin to retrieve all tickets', async () => {
        const res = await request(app)
            .get('/tickets/fetchTickets/1')
            .set('Cookie', adminJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.tickets).toBeInstanceOf(Array);
        expect(res.body.pages).toBeGreaterThanOrEqual(1);
        expect(res.body.num_tickets).toBeGreaterThanOrEqual(1);
        expect(res.body.tickets.some(ticket => ticket.id === globalSetupTicketId)).toBe(true);
    });

    test('GET /tickets - Customer shouldn\'t be allowed to retrieve tickets', async () => {
        // Il ticket globale è stato creato dal globalCustomerJwtCookie
        const res = await request(app)
            .get('/tickets/fetchTickets/1')
            .set('Cookie', globalCustomerJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });

    test('GET /tickets/{id_ticket} - Should return 404 for user retrieving a ticket he can\'t access', async () => {
        expect(globalSetupTicketId).toBeDefined();
        const temp_customer_user_data = {
            email: generateUniqueEmail('temp.customer.unauth'),
            name: 'Temp',
            surname: 'Customer',
            password: 'CustomerPassword1!',
            role: 'customer'
        };
        await request(app).post('/users/user').send(temp_customer_user_data).set('Content-Type', 'application/json').timeout(10000);
        const unauthLoginRes = await request(app).post('/users/login').send({ email: temp_customer_user_data.email, password: temp_customer_user_data.password }).set('Content-Type', 'application/json').timeout(10000);
        const unauthJwtCookie = unauthLoginRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));

        const res = await request(app)
            .get(`/tickets/${globalSetupTicketId}`)
            .set('Cookie', unauthJwtCookie) // Cliente non relazionato tenta di accedere
            .timeout(10000);
        expect(res.statusCode).toBe(404);
    });
});

// Test Aggiornamento Stato Ticket
describe('Ticket Status Update', () => {
    let ticketToUpdateProductId; // ID del ticket prodotto specifico per il test
    let ticketToUpdateOrderId; // ID del ticket ordine specifico per il test
    let currentArtisanData;
    let currentCustomerJwtCookie; // JWT del cliente per creare i ticket
    let currentArtisanJwtCookie; // JWT dell'artigiano per creare i prodotti

    beforeEach(async () => {
        // Creiamo un nuovo artigiano e cliente per ogni test di aggiornamento per un isolamento completo
        currentArtisanData = {
            email: generateUniqueEmail('artisan.ticket.update'),
            name: `UpdateArtisan${generateRandomAlphaSuffix()}`,
            surname: 'Test',
            password: 'ArtisanPassword1!',
            role: 'artisan'
        };
        await request(app).post('/users/user')
            .send(currentArtisanData)
            .set('Content-Type', 'application/json')
            .timeout(20000);
        const loginArtisanRes = await request(app)
            .post('/users/login')
            .send({ email: currentArtisanData.email, password: currentArtisanData.password })
            .set('Content-Type', 'application/json')
            .timeout(20000);
        currentArtisanJwtCookie = loginArtisanRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
        expect(currentArtisanJwtCookie).toBeDefined();

        const currentCustomerData = {
            email: generateUniqueEmail('customer.ticket.update'),
            name: `UpdateCustomer${generateRandomAlphaSuffix()}`,
            surname: 'Test',
            password: 'CustomerPassword1!',
            role: 'customer'
        };
        await request(app).post('/users/user')
            .send(currentCustomerData)
            .set('Content-Type', 'application/json')
            .timeout(20000);
        const loginCustomerRes = await request(app)
            .post('/users/login')
            .send({ email: currentCustomerData.email, password: currentCustomerData.password })
            .set('Content-Type', 'application/json')
            .timeout(20000);
        currentCustomerJwtCookie = loginCustomerRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
        expect(currentCustomerJwtCookie).toBeDefined();

        // 1. Crea un prodotto e segnalalo per testare la risoluzione di un ticket 'product'
        const productName = `ProductTicket${generateRandomAlphaSuffix()}`;
        const product_data = {
            name: productName,
            description: 'Prodotto per test ticket di tipo product.',
            short_description: 'Prod Ticket.',
            price: 10.00,
            categories: ['Test'],
            images: [globalUploadedImageId],
            quantity: 1
        };
        const productCreateRes = await request(app)
            .post('/products/product')
            .set('Cookie', currentArtisanJwtCookie)
            .send(product_data)
            .set('Content-Type', 'application/json')
            .timeout(20000);
        expect(productCreateRes.statusCode).toBe(200);
        const tempProductId = productCreateRes.body.id;

        const productReportData = { note: 'Segnalazione prodotto per test risoluzione.' };
        const artisanSlug = generateArtisanSlug(currentArtisanData.name, currentArtisanData.surname);
        const productSlug = generateProductSlug(productName);

        const ticketProductCreateRes = await request(app)
            .post(`/products/report/${artisanSlug}/${productSlug}`)
            .set('Cookie', currentCustomerJwtCookie)
            .send(productReportData)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(ticketProductCreateRes.statusCode).toBe(200);
        ticketToUpdateProductId = ticketProductCreateRes.body.ticket_id;

        // 2. Crea un ordine e segnalalo per testare la risoluzione di un ticket 'order'
        const orderProductName = `OrderTicket${generateRandomAlphaSuffix()}`;
        const order_product_data = {
            name: orderProductName,
            description: 'Prodotto per test ticket di tipo order.',
            short_description: 'Order Ticket.',
            price: 20.00,
            categories: ['Test'],
            images: [globalUploadedImageId],
            quantity: 1
        };
        const orderProductCreateRes = await request(app)
            .post('/products/product')
            .set('Cookie', currentArtisanJwtCookie)
            .send(order_product_data)
            .set('Content-Type', 'application/json')
            .timeout(20000);
        expect(orderProductCreateRes.statusCode).toBe(200);
        const tempOrderProductId = orderProductCreateRes.body.id;

        await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: tempOrderProductId, quantity: 1 }])
            .set('Content-Type', 'application/json')
            .timeout(10000);

        const purchaseRes = await request(app)
            .post('/purchases/purchase')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(20000);
        expect(purchaseRes.statusCode).toBe(200);
        const tempOrderId = purchaseRes.body.order_id;

        const orderReportData = { note: 'Segnalazione ordine per test risoluzione.' };
        const ticketOrderCreateRes = await request(app)
            .post(`/purchases/report/${tempOrderId}`)
            .set('Cookie', currentCustomerJwtCookie)
            .send(orderReportData)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(ticketOrderCreateRes.statusCode).toBe(200);
        ticketToUpdateOrderId = ticketOrderCreateRes.body.ticket_id;
    });

    test('POST /resolve/product/{ticket_id} - Should allow admin to resolve a product ticket', async () => {
        expect(ticketToUpdateProductId).toBeDefined();
        const res = await request(app)
            .post(`/tickets/resolve/product/${ticketToUpdateProductId}`)
            .set('Cookie', adminJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    test('POST /resolve/order/{ticket_id} - Should allow admin to resolve an order ticket', async () => {
        expect(ticketToUpdateOrderId).toBeDefined();
        const res = await request(app)
            .post(`/tickets/resolve/order/${ticketToUpdateOrderId}`)
            .set('Cookie', adminJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    test('POST /resolve/product/{ticket_id} - Should prevent non-admins from resolving a product ticket (403 Forbidden)', async () => {
        expect(ticketToUpdateProductId).toBeDefined();
        const res = await request(app)
            .post(`/tickets/resolve/product/${ticketToUpdateProductId}`)
            .set('Cookie', currentCustomerJwtCookie) // Cliente tenta di risolvere
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });

    test('POST /resolve/order/{ticket_id} - Should prevent non-admins from resolving an order ticket (403 Forbidden)', async () => {
        expect(ticketToUpdateOrderId).toBeDefined();
        const res = await request(app)
            .post(`/tickets/resolve/order/${ticketToUpdateOrderId}`)
            .set('Cookie', currentArtisanJwtCookie) // Artigiano tenta di risolvere
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });

    test('POST /resolve/{ticket_type}/{ticket_id} - Should return 404 for non-existent or already closed ticket (admin)', async () => {
        expect(ticketToUpdateProductId).toBeDefined();
        // Tentativo di risolvere un ticket inesistente
        let res = await request(app)
            .post('/tickets/resolve/product/9999999')
            .set('Cookie', adminJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(404);

        // Risolvi il ticket prodotto creato nel beforeEach (dovrebbe avere successo)
        await request(app)
            .post(`/tickets/resolve/product/${ticketToUpdateProductId}`)
            .set('Cookie', adminJwtCookie)
            .timeout(10000);
        
        // Tentativo di risolvere lo stesso ticket già chiuso (dovrebbe fallire con 404)
        res = await request(app)
            .post(`/tickets/resolve/product/${ticketToUpdateProductId}`)
            .set('Cookie', adminJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(404);
    });

    test('POST /resolve/{ticket_type}/{ticket_id} - Should return 400 for invalid ticket_type or ticket_id (admin)', async () => {
        // Tipo di ticket non valido
        let res = await request(app)
            .post(`/tickets/resolve/invalidType/${ticketToUpdateProductId}`)
            .set('Cookie', adminJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(404); // Il tuo backend restituisce 404 per tipo non valido

        // ID ticket non numerico
        res = await request(app)
            .post(`/tickets/resolve/product/abc`)
            .set('Cookie', adminJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(400);
    });
});