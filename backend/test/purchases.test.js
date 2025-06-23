import app from '../app.js'; // Assicurati che 'app' sia l'istanza del tuo API Gateway
import request from 'supertest';
import path from 'path';
import beforeAllCallback from './waitForServices.js'; // Funzione per aspettare che i servizi siano online

// VARIABILI GLOBALI PER I TEST
let adminJwtCookie; // JWT per l'admin (globale)
let customerOrderId; // ID di un ordine creato da un cliente nel beforeAll (per test su ordini esistenti)
let customerOrderItemId; // ID di un item specifico all'interno dell'ordine del cliente nel beforeAll

// Variabili per utenti e prodotti creati nel beforeAll per setup iniziale (es. per customerOrderId)
let globalArtisanJwtCookie;
let globalCustomerJwtCookie;
let globalUploadedImageId;
let globalSetupProductId;

let globalCounter = 0;

// Dati per l'utente artigiano globale (per creare il prodotto di setup iniziale)
const global_artisan_user_data = {
    email: 'global.artisan@example.com',
    name: 'Global',
    surname: 'Artisan',
    password: 'ArtisanPassword1!',
    role: 'artisan'
};

// Dati per l'utente cliente globale (per l'acquisto di setup iniziale)
const global_customer_user_data = {
    email: 'global.customer@example.com',
    name: 'Global',
    surname: 'Customer',
    password: 'CustomerPassword1!',
    role: 'customer'
};

// Dati per l'utente amministratore (pre-esistente, non registrato tramite API)
const admin_user_data = {
    email: 'testadmin@example.com',
    password: 'testpassword'
};

// Dati per il prodotto di setup iniziale
const global_setup_product_data = {
    name: 'Prodotto Setup Globale',
    description: 'Prodotto usato per setup in beforeAll per ordini.',
    short_description: 'Global Setup.',
    price: 100.00,
    categories: ['Generico'],
    images: [], // Popolato con globalUploadedImageId
    quantity: 1 // Quantità sufficiente solo per un acquisto iniziale
};

// Funzione helper per generare email uniche
function generateUniqueEmail(prefix) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8); // Random alphanumeric string
    return `${prefix}.${timestamp}.${randomSuffix}@example.com`;
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
        .attach('image', path.resolve(process.cwd(), './test/images/product_test_image.png')) // Assicurati che questo file esista
        .timeout(20000);
    expect(res.statusCode).toBe(200);
    globalUploadedImageId = res.body.file_id;
    expect(globalUploadedImageId).toBeDefined();
    global_setup_product_data.images.push(globalUploadedImageId);

    // 5. Crea un prodotto di setup globale per i test di ordine/rimborso
    console.log('Creating global setup product...');
    const productCreateRes = await request(app)
        .post('/products/product')
        .set('Cookie', globalArtisanJwtCookie)
        .send(global_setup_product_data)
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(productCreateRes.statusCode).toBe(200);
    expect(productCreateRes.body.id).toBeDefined();
    globalSetupProductId = productCreateRes.body.id;
    console.log(`Global setup product created with ID: ${globalSetupProductId}`);

    // 6. Aggiungi il prodotto di setup al carrello del cliente globale
    console.log('Adding global setup product to global customer cart...');
    const addToCartRes = await request(app)
        .post('/purchases/addToCart')
        .set('Cookie', globalCustomerJwtCookie)
        .send([{ id: globalSetupProductId, quantity: 1 }])
        .set('Content-Type', 'application/json')
        .timeout(10000);
    expect(addToCartRes.statusCode).toBe(200);

    // 7. Effettua l'acquisto iniziale per ottenere customerOrderId e customerOrderItemId
    console.log('Performing initial purchase to get global order IDs...');
    const purchaseRes = await request(app)
        .post('/purchases/purchase')
        .set('Cookie', globalCustomerJwtCookie)
        .timeout(20000);
    expect(purchaseRes.statusCode).toBe(200);
    expect(purchaseRes.body.order_id).toBeDefined();
    expect(purchaseRes.body.items).toBeInstanceOf(Array);
    
    customerOrderId = purchaseRes.body.order_id;
    customerOrderItemId = purchaseRes.body.items[0].id;
    console.log(`Initial global purchase successful. Order ID: ${customerOrderId}, Item ID: ${customerOrderItemId}`);

    console.log('Global setup complete for Purchases tests.');
});

// Test health check del microservizio Purchases
describe('Purchases Microservice Health Check', () => {
    test('GET /purchases should return 200 OK', async () => {
        const res = await request(app)
            .get('/purchases')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ service: 'purchases', status: 'ok' });
    });
});

// Test gestione carrello
describe('Cart Management', () => {
    let currentArtisanJwtCookie;
    let currentCustomerJwtCookie;
    let currentTestProductId;
    let currentTestProductName; // Per un'asserzione più precisa dello slug
    let currentArtisanData; 

    beforeEach(async () => {
        // Registra e logga un NUOVO artigiano per ogni test in questo blocco
        currentArtisanData = {
            email: generateUniqueEmail('artisan.cart'),
            name: `ArtisanCart${Date.now()}`,
            surname: 'Test',
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

        // Registra e logga un NUOVO cliente per ogni test in questo blocco
        const currentCustomerData = {
            email: generateUniqueEmail('customer.cart'),
            name: `CustomerCart${Date.now()}`,
            surname: 'Test',
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

        // Crea un NUOVO prodotto per ogni test di carrello, con quantità iniziale di 10
        currentTestProductName = `Prodotto Cart Test ${Date.now()}`; // Memorizza il nome per lo slug
        const test_product_data_for_cart = {
            name: currentTestProductName,
            description: 'Prodotto dedicato per test carrello.',
            short_description: 'Cart Test.',
            price: 25.00,
            categories: ['Generico'],
            images: [globalUploadedImageId], // Riutilizza l'immagine globale
            quantity: 10
        };
        const productCreateRes = await request(app)
            .post('/products/product')
            .set('Cookie', currentArtisanJwtCookie)
            .send(test_product_data_for_cart)
            .set('Content-Type', 'application/json')
            .timeout(20000);
        expect(productCreateRes.statusCode).toBe(200);
        currentTestProductId = productCreateRes.body.id;
        console.log(`BeforeEach (Cart): Created product ${currentTestProductId} for new customer/artisan.`);
        
        // Assicurati che il carrello per questo nuovo cliente sia vuoto per il prodotto appena creato.
        // Questo usa il currentCustomerJwtCookie, assicurando l'isolamento.
        const cartContentBeforeClean = await request(app)
            .get('/purchases/cart')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(10000);
        const productAlreadyInCart = cartContentBeforeClean.body.find(item => item.id === currentTestProductId);
        if (productAlreadyInCart) {
             await request(app)
                .post('/purchases/addToCart')
                .set('Cookie', currentCustomerJwtCookie)
                .send([{ id: currentTestProductId, quantity: -productAlreadyInCart.quantity }])
                .set('Content-Type', 'application/json')
                .timeout(10000);
            console.log(`BeforeEach (Cart): Cleared product ${currentTestProductId} from cart.`);
        }
    });

    test('POST /purchases/addToCart - Should allow a customer to add 1 product to cart', async () => {
        const res = await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: 1 }])
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body.find(item => item.id === currentTestProductId).quantity).toBe(1);
    });

    test('POST /purchases/addToCart - Should allow a customer to update quantity in cart (add 2 more for total 3)', async () => {
        await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: 1 }])
            .set('Content-Type', 'application/json')
            .timeout(10000);

        const res = await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: 2 }]) // Add 2 more
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.find(item => item.id === currentTestProductId).quantity).toBe(3);
    });

    test('POST /purchases/addToCart - Should allow a customer to remove 1 item from cart (total 0 if starting with 1)', async () => {
        await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: 1 }])
            .set('Content-Type', 'application/json')
            .timeout(10000);

        const res = await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: -1 }])
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        const cartAfterRemoval = res.body.find(item => item.id === currentTestProductId);
        expect(cartAfterRemoval.quantity).toBe(0);
    });

    test('POST /purchases/addToCart - Should prevent non-customers from adding to cart (403 Forbidden)', async () => {
        const res = await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentArtisanJwtCookie) // Artigiano tenta di aggiungere al carrello
            .send([{ id: currentTestProductId, quantity: 1 }])
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });

    test('POST /purchases/addToCart - Should return 523 for invalid product ID', async () => {
        const res = await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: 999999, quantity: 1 }]) // ID prodotto inesistente
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(523); // Product not found
    });

    test('GET /purchases/cart - Should return empty array for empty cart initially', async () => {
        // beforeEach ensures cart is empty for currentTestProductId
        const res = await request(app)
            .get('/purchases/cart')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        const productStillInCart = res.body.find(item => item.id === currentTestProductId);
        expect(productStillInCart).toBeUndefined(); // Should be empty for this product
    });

    test('GET /purchases/cart - Should retrieve customer cart contents with 5 items', async () => {
        await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: 5 }])
            .set('Content-Type', 'application/json')
            .timeout(10000);
        
        const res = await request(app)
            .get('/purchases/cart')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body.find(item => item.id === currentTestProductId).quantity).toBe(5);
    });
});

// Test processo di acquisto
describe('Purchase Process', () => {
    let currentArtisanJwtCookie;
    let currentCustomerJwtCookie;
    let currentTestProductId;
    let currentTestProductName;
    let currentArtisanData;

    beforeEach(async () => {
        // Registra e logga un NUOVO artigiano per ogni test in questo blocco
        currentArtisanData = {
            email: generateUniqueEmail('artisan.purchase'),
            name: `ArtisanPurchase${Date.now()}`,
            surname: 'Test',
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

        // Registra e logga un NUOVO cliente per ogni test in questo blocco
        const currentCustomerData = {
            email: generateUniqueEmail('customer.purchase'),
            name: `CustomerPurchase${Date.now()}`,
            surname: 'Test',
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

        // Crea un NUOVO prodotto per ogni test di acquisto, con quantità iniziale di 10
        currentTestProductName = `Prodotto Purchase Test ${Date.now()}`; // Memorizza il nome per lo slug
        const test_product_data_for_purchase = {
            name: currentTestProductName,
            description: 'Prodotto dedicato per test acquisto.',
            short_description: 'Purchase Test.',
            price: 50.00,
            categories: ['Generico'],
            images: [globalUploadedImageId], // Riutilizza l'immagine globale
            quantity: 10
        };
        const productCreateRes = await request(app)
            .post('/products/product')
            .set('Cookie', currentArtisanJwtCookie)
            .send(test_product_data_for_purchase)
            .set('Content-Type', 'application/json')
            .timeout(20000);
        expect(productCreateRes.statusCode).toBe(200);
        currentTestProductId = productCreateRes.body.id;
        console.log(`BeforeEach (Purchase): Created product ${currentTestProductId} for new customer/artisan.`);

        // Assicurati che il carrello per questo nuovo cliente sia pulito per il prodotto prima di ogni test.
        const cartContentBeforeClean = await request(app)
            .get('/purchases/cart')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(10000);
        const productAlreadyInCart = cartContentBeforeClean.body.find(item => item.id === currentTestProductId);
        if (productAlreadyInCart) {
             await request(app)
                .post('/purchases/addToCart')
                .set('Cookie', currentCustomerJwtCookie)
                .send([{ id: currentTestProductId, quantity: -productAlreadyInCart.quantity }])
                .set('Content-Type', 'application/json')
                .timeout(10000);
            console.log(`BeforeEach (Purchase): Cleared product ${currentTestProductId} from cart.`);
        }
        
        // Aggiungi 1 di questo prodotto al carrello per gli acquisti (salvo test specifici).
        // Questo usa il currentCustomerJwtCookie, assicurando l'isolamento.
        await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: 1 }])
            .set('Content-Type', 'application/json')
            .timeout(10000);
    });

    test('POST /purchases/purchase - Should return 525 for empty cart purchase', async () => {
        // Svuota il carrello specificamente per questo test
        await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: -100 }]) // Svuota il carrello
            .set('Content-Type', 'application/json')
            .timeout(10000);

        const res = await request(app)
            .post('/purchases/purchase')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(525); // Cart is empty
    });

    test('POST /purchases/purchase - Should return 403 if not a customer', async () => {
        const res = await request(app)
            .post('/purchases/purchase')
            .set('Cookie', currentArtisanJwtCookie) // Artigiano tenta di acquistare
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });

    test('POST /purchases/purchase - Should allow a customer to purchase items in cart successfully', async () => {
        // Il beforeEach ha già messo 1 prodotto nel carrello.
        const res = await request(app)
            .post('/purchases/purchase')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(20000);
        expect(res.statusCode).toBe(200);
        expect(res.body.order_id).toBeDefined();
        expect(res.body.items).toBeInstanceOf(Array);
        expect(res.body.items.length).toBe(1);
        expect(res.body.items[0].id).toBe(currentTestProductId);
    });

    test('POST /purchases/purchase - Should return 525 for empty cart during purchase', async () => {
        // Aggiungo la quantità massima per saturare il prodotto
        await request(app)
            .post('/purchases/addToCart')
            .set('Cookie', currentCustomerJwtCookie)
            .send([{ id: currentTestProductId, quantity: 9 }]) // Aggiunge altri 9, totale 10 (se 1 era già nel carrello dal beforeEach)
            .set('Content-Type', 'application/json')
            .timeout(10000);

        // Effettuo l'acquisto, che consumerà la quantità.
        const firstPurchaseRes = await request(app)
            .post('/purchases/purchase')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(10000);
        expect(firstPurchaseRes.statusCode).toBe(200); // Questo acquisto dovrebbe avere successo

        // Tenta l'acquisto con carrello che ora è vuoto o ha item non disponibili
        const res = await request(app)
            .post('/purchases/purchase')
            .set('Cookie', currentCustomerJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(525); // Il carrello dovrebbe essere vuoto per il prodotto dopo il primo acquisto.
                                          // Se il backend pulisce il carrello dopo l'acquisto,
                                          // allora 525 è l'attesa giusta qui.
    });
});

// Test gestione ordini (utilizzano customerOrderId e customerOrderItemId dal beforeAll)
describe('Order Management', () => {
    test('GET /purchases/orders - Should retrieve orders for a customer', async () => {
        const res = await request(app)
            .get('/purchases/orders')
            .set('Cookie', globalCustomerJwtCookie) // Usa il cliente globale
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.some(order => order.id === customerOrderId)).toBe(true);
    });

    test('GET /purchases/orders - Should retrieve orders for an artisan (if they have products in orders)', async () => {
        const res = await request(app)
            .get('/purchases/orders')
            .set('Cookie', globalArtisanJwtCookie) // Usa l'artigiano globale
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        // Dovremmo vedere il nostro prodotto di test globale tra gli ordini dell'artigiano globale
        expect(res.body.some(item => item.product_id === globalSetupProductId)).toBe(true);
    });

    test('GET /purchases/order/{id_order} - Should retrieve details for a specific order (customer)', async () => {
        expect(customerOrderId).toBeDefined();
        const res = await request(app)
            .get(`/purchases/order/${customerOrderId}`)
            .set('Cookie', globalCustomerJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.timestamp).toBeDefined();
        expect(res.body.items).toBeInstanceOf(Array);
        expect(res.body.items[0].id).toBe(globalSetupProductId); // ID del prodotto di setup
    });

    test('GET /purchases/order/{id_order} - Should retrieve details for a specific order (admin)', async () => {
        expect(customerOrderId).toBeDefined();
        const res = await request(app)
            .get(`/purchases/order/${customerOrderId}`)
            .set('Cookie', adminJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.timestamp).toBeDefined();
        expect(res.body.items).toBeInstanceOf(Array);
    });

    test('GET /purchases/order/{id_order} - Should return 404 for non-existent order', async () => {
        const res = await request(app)
            .get('/purchases/order/999999')
            .set('Cookie', globalCustomerJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(404);
    });

    test('GET /purchases/order/{id_order} - Should return 403 for unauthorized access', async () => {
        expect(customerOrderId).toBeDefined();
        // Artigiano che non ha prodotto nell'ordine o utente generico non può vedere ordine di altri
        const temp_artisan_user_data = {
            email: generateUniqueEmail('unauth.artisan.order'), // Nuovo utente temporaneo
            name: 'UnauthorizedOrder',
            surname: 'Artisan',
            password: 'ArtisanPassword1!',
            role: 'artisan'
        };
        await request(app).post('/users/user')
            .send(temp_artisan_user_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        const unauthLoginRes = await request(app)
            .post('/users/login')
            .send({ email: temp_artisan_user_data.email, password: temp_artisan_user_data.password })
            .set('Content-Type', 'application/json')
            .timeout(10000);
        const unauthJwtCookie = unauthLoginRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));

        const res = await request(app)
            .get(`/purchases/order/${customerOrderId}`)
            .set('Cookie', unauthJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });
});

// Test rimborso e stato articolo (utilizzano customerOrderId e customerOrderItemId dal beforeAll)
describe('Refund and Item Status', () => {
    test('PUT /purchases/itemStatus - Should allow artisan to update an item status in their order', async () => {
        expect(customerOrderId).toBeDefined();
        expect(customerOrderItemId).toBeDefined();
        const update_data = {
            order_id: customerOrderId,
            item_id: customerOrderItemId,
            item_status: 'Spedito'
        };
        const res = await request(app)
            .put('/purchases/itemStatus')
            .set('Cookie', globalArtisanJwtCookie) // Artigiano globale che ha creato il prodotto
            .send(update_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.result).toBe('ok');
    });

    test('PUT /purchases/itemStatus - Should allow admin to update an item status in any order', async () => {
        expect(customerOrderId).toBeDefined();
        expect(customerOrderItemId).toBeDefined();
        const update_data = {
            order_id: customerOrderId,
            item_id: customerOrderItemId,
            item_status: 'Consegnato'
        };
        const res = await request(app)
            .put('/purchases/itemStatus')
            .set('Cookie', adminJwtCookie)
            .send(update_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.result).toBe('ok');
    });

    test('PUT /purchases/itemStatus - Should prevent non-artisans/admins from updating item status (403 Forbidden)', async () => {
        expect(customerOrderId).toBeDefined();
        expect(customerOrderItemId).toBeDefined();
        const update_data = {
            order_id: customerOrderId,
            item_id: customerOrderItemId,
            item_status: 'Annullato'
        };
        const res = await request(app)
            .put('/purchases/itemStatus')
            .set('Cookie', globalCustomerJwtCookie) // Cliente globale tenta di aggiornare
            .send(update_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });

    test('POST /purchases/refund - Should allow an admin to process a refund', async () => {
        expect(customerOrderId).toBeDefined();
        expect(customerOrderItemId).toBeDefined();
        const refund_data = {
            amount: 100.00, // L'importo del prodotto di test globale
            product_id: globalSetupProductId, // L'ID del prodotto globale
            order_id: customerOrderId
        };
        const res = await request(app)
            .post('/purchases/refund')
            .set('Cookie', adminJwtCookie)
            .send(refund_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    test('POST /purchases/refund - Should prevent non-admins from processing a refund (403 Forbidden)', async () => {
        expect(customerOrderId).toBeDefined();
        expect(customerOrderItemId).toBeDefined();
        const refund_data = {
            amount: 10.00,
            product_id: globalSetupProductId,
            order_id: customerOrderId
        };
        const res = await request(app)
            .post('/purchases/refund')
            .set('Cookie', globalCustomerJwtCookie) // Cliente globale tenta di rimborsare
            .send(refund_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });

    test('POST /purchases/refund - Should return 400 for invalid refund data (e.g., non-existent order/product)', async () => {
        const refund_data = {
            amount: 10.00,
            order_id: customerOrderId
        };
        const res = await request(app)
            .post('/purchases/refund')
            .set('Cookie', adminJwtCookie)
            .send(refund_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(400);
    });

    test('POST /purchases/refund - Should return 404 for invalid product id', async () => {
        const refund_data = {
            amount: 10.00,
            product_id: 999999, // Prodotto inesistente
            order_id: customerOrderId
        };
        const res = await request(app)
            .post('/purchases/refund')
            .set('Cookie', adminJwtCookie)
            .send(refund_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(404);
    });
});

// Test clienti (per artigiani) (utilizza l'artigiano globale e il cliente globale dall'acquisto iniziale)
describe('Customers (Artisan View)', () => {
    test('GET /purchases/customers - Should allow an artisan to retrieve customer data', async () => {
        const res = await request(app)
            .get('/purchases/customers')
            .set('Cookie', globalArtisanJwtCookie) // Usa l'artigiano globale
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        // Dovremmo trovare il cliente globale nei clienti dell'artigiano globale
        const testCustomer = res.body.find(c => c.email === global_customer_user_data.email);
        expect(testCustomer).toBeDefined();
        expect(testCustomer.num_orders).toBeGreaterThanOrEqual(1);
    });

    test('GET /purchases/customers - Should prevent non-artisans from retrieving customer data (403 Forbidden)', async () => {
        const res = await request(app)
            .get('/purchases/customers')
            .set('Cookie', globalCustomerJwtCookie) // Cliente globale tenta di accedere
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });
});

// Test segnalazione ordine (utilizza customerOrderId dal beforeAll)
describe('Order Reporting', () => {
    test('POST /purchases/report/{id_order} - Should allow a customer to report their order', async () => {
        expect(customerOrderId).toBeDefined();
        const report_data = { note: 'L\'ordine è arrivato danneggiato.' };
        const res = await request(app)
            .post(`/purchases/report/${customerOrderId}`)
            .set('Cookie', globalCustomerJwtCookie) // Usa il cliente globale
            .send(report_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.ticket_id).toBeDefined();
    });

    test('POST /purchases/report/{id_order} - Should return 404 for reporting a non-existent order', async () => {
        const res = await request(app)
            .post('/purchases/report/999999')
            .set('Cookie', globalCustomerJwtCookie) // Usa il cliente globale
            .send({ note: 'Ordine inesistente.' })
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(404);
    });

    test('POST /purchases/report/{id_order} - Should return 403 for reporting another user\'s order (or non-customer)', async () => {
        expect(customerOrderId).toBeDefined();
        // Artigiano temporaneo per testare l'accesso non autorizzato
        const temp_artisan_user_data = {
            email: generateUniqueEmail('unauth.artisan.report'), // Nuovo utente temporaneo
            name: 'UnauthorizedReport',
            surname: 'Artisan',
            password: 'ArtisanPassword1!',
            role: 'artisan'
        };
        await request(app).post('/users/user')
            .send(temp_artisan_user_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        const unauthLoginRes = await request(app)
            .post('/users/login')
            .send({ email: temp_artisan_user_data.email, password: temp_artisan_user_data.password })
            .set('Content-Type', 'application/json')
            .timeout(10000);
        const unauthJwtCookie = unauthLoginRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));

        const res = await request(app)
            .post(`/purchases/report/${customerOrderId}`)
            .set('Cookie', unauthJwtCookie) // Artigiano temporaneo tenta di segnalare l'ordine del cliente globale
            .send({ note: 'Tentativo di segnalazione non autorizzata.' })
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(404);
    });
});