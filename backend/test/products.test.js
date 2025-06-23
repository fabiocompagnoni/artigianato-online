import app from '../app.js'; // Assicurati che 'app' sia l'istanza del tuo API Gateway
import request from 'supertest';
import path from 'path';
import beforeAllCallback from './waitForServices.js'; // Funzione per aspettare che i servizi siano online

// VARIABILI GLOBALI PER I TEST
let artisanJwtCookie;
let adminJwtCookie;
let customerJwtCookie;
let uploadedImageId; // ID dell'immagine caricata per i test sui prodotti
let testProductId; // ID del prodotto creato nel beforeAll
let createdProductSlug; // Slug del prodotto creato nel beforeAll

// Dati per un utente artigiano di test
const artisan_user_data = {
    email: 'test.artisan@example.com',
    name: 'Test',
    surname: 'Artisan',
    password: 'ArtisanPassword1!',
    role: 'artisan'
};

// Dati per un utente cliente di test
const customer_user_data = {
    email: 'test.customer@example.com',
    name: 'Test',
    surname: 'Customer',
    password: 'CustomerPassword1!',
    role: 'customer'
};

// Dati per un utente amministratore di test (pre-esistente, non registrato tramite API)
const admin_user_data = {
    email: 'testadmin@example.com', // Credenziali corrette
    password: 'testpassword'      // Credenziali corrette
};

// Dati per il prodotto di base creato nel beforeAll
const base_test_product_data = {
    name: 'Vaso di Prova',
    description: 'Un bellissimo vaso di prova fatto a mano per i test.',
    short_description: 'Vaso test.',
    price: 19.99,
    categories: ['Decorazioni', 'Casa'],
    images: [], // Questo verrà popolato con uploadedImageId
    quantity: 5
};

// Funzione helper per generare lo slug dell'artigiano
function generateArtisanSlug(name, surname) {
    return `${name.toLowerCase()}-${surname.toLowerCase()}`;
}

// Funzione helper per generare lo slug del prodotto (semplificato)
function generateProductSlug(productName) {
    // Il backend di products dovrebbe generare slug in modo deterministico o restituirli.
    // Qui assumiamo una semplice conversione in lowercase e trattini.
    return productName.toLowerCase().replace(/ /g, '-');
}

// Aspettiamo che tutti i servizi siano online prima di eseguire i test
beforeAll(async () => {
    // Esegui la callback per avviare i servizi.
    // È CRUCIALE che 'waitForServices.js' sia robusto e attenda effettivamente che
    // TUTTI i microservizi siano pronti.
    try {
        await beforeAllCallback(app);
    } catch (error) {
        console.error('Failed to wait for services to be online, aborting tests:', error);
        fail('Microservices did not become ready.'); // Forziamo il fallimento del beforeAll
    }

    // 1. Registra e logga l'utente artigiano
    let res = await request(app)
        .post('/users/user')
        .send(artisan_user_data)
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(res.statusCode).toBe(200);

    let loginRes = await request(app)
        .post('/users/login')
        .send({ email: artisan_user_data.email, password: artisan_user_data.password })
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(loginRes.statusCode).toBe(200);
    artisanJwtCookie = loginRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
    expect(artisanJwtCookie).toBeDefined();


    // 2. Registra e logga l'utente cliente
    res = await request(app)
        .post('/users/user')
        .send(customer_user_data)
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(res.statusCode).toBe(200);

    loginRes = await request(app)
        .post('/users/login')
        .send({ email: customer_user_data.email, password: customer_user_data.password })
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(loginRes.statusCode).toBe(200);
    customerJwtCookie = loginRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
    expect(customerJwtCookie).toBeDefined();

    // 3. Logga l'utente amministratore (assunto pre-esistente)
    loginRes = await request(app)
        .post('/users/login')
        .send({ email: admin_user_data.email, password: admin_user_data.password })
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(loginRes.statusCode).toBe(200);
    adminJwtCookie = loginRes.headers['set-cookie'].find(cookie => cookie.startsWith('jwt='));
    expect(adminJwtCookie).toBeDefined();


    // 4. Carica un'immagine di test (necessaria per la creazione del prodotto)
    res = await request(app)
        .post('/images/upload')
        .set('Cookie', artisanJwtCookie)
        .attach('image', path.resolve(process.cwd(), './test/images/product_test_image.png'))
        .timeout(20000);
    expect(res.statusCode).toBe(200);
    uploadedImageId = res.body.file_id;
    expect(uploadedImageId).toBeDefined();
    base_test_product_data.images.push(uploadedImageId);

    // 5. Crea un prodotto base da utilizzare in molti test successivi
    console.log('Creating base product for tests...');
    const productCreateRes = await request(app)
        .post('/products/product')
        .set('Cookie', artisanJwtCookie)
        .send(base_test_product_data)
        .set('Content-Type', 'application/json')
        .timeout(20000);
    expect(productCreateRes.statusCode).toBe(200);
    expect(productCreateRes.body.id).toBeDefined();
    testProductId = productCreateRes.body.id; // Assegna l'ID del prodotto qui
    createdProductSlug = generateProductSlug(base_test_product_data.name); // Assegna lo slug qui
    console.log(`Base product created with ID: ${testProductId} and Slug: ${createdProductSlug}`);

    console.log('Setup complete: Artisan, Customer, and Admin logged in, image uploaded, base product created.');
});

// Test health check del microservizio Products
describe('Products Microservice Health Check', () => {
    test('GET /products/status should return 200 OK', async () => {
        const res = await request(app)
            .get('/products/status')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ service: 'products', status: 'ok' });
    });
});

// Test creazione prodotto
describe('Product Creation', () => {
    // Questo test ora crea un NUOVO prodotto per verificare la funzionalità di creazione in isolamento
    test('POST /products/product - Should allow an artisan to create another product', async () => {
        const another_test_product_data = {
            name: 'Vaso di Prova 2',
            description: 'Un altro vaso di prova fatto a mano.',
            short_description: 'Vaso test 2.',
            price: 25.00,
            categories: ['Decorazioni'],
            images: [uploadedImageId],
            quantity: 3
        };
        const res = await request(app)
            .post('/products/product')
            .set('Cookie', artisanJwtCookie)
            .send(another_test_product_data)
            .set('Content-Type', 'application/json')
            .timeout(15000);
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe(another_test_product_data.name);
    });

    test('POST /products/product - Should prevent non-artisans from creating a product (403 Forbidden)', async () => {
        const temp_product_data_for_403 = {
            name: 'Invalid Product',
            description: 'Desc.',
            short_description: 'ShortDesc.',
            price: 10.00,
            categories: ['Altro'],
            images: [uploadedImageId],
            quantity: 1
        };
        const res = await request(app)
            .post('/products/product')
            .set('Cookie', customerJwtCookie) // Usa JWT di un cliente
            .send(temp_product_data_for_403)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });

    test('POST /products/product - Should return 400 for invalid product data (e.g. empty name)', async () => {
        const invalid_data = { ...base_test_product_data, name: '' }; // Nome vuoto
        const res = await request(app)
            .post('/products/product')
            .set('Cookie', artisanJwtCookie)
            .send(invalid_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(400);
    });
});

// Test recupero prodotti
describe('Product Retrieval', () => {
    test('GET /products - Should retrieve all products', async () => {
        const res = await request(app)
            .get('/products')
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.products).toBeInstanceOf(Array);
        expect(res.body.products.length).toBeGreaterThanOrEqual(1); // Almeno il prodotto base e quello creato nel test
        expect(res.body.numberProducts).toBeGreaterThanOrEqual(1);
    });

    test('GET /products/1 - Should retrieve products with pagination', async () => {
        const res = await request(app)
            .get('/products/1') // Prima pagina
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.products).toBeInstanceOf(Array);
        expect(res.body.products.length).toBeGreaterThanOrEqual(1);
        expect(res.body.pages).toBeDefined();
        expect(res.body.numProducts).toBeDefined();
    });

    test('GET /products/1?artisan=' + generateArtisanSlug(artisan_user_data.name, artisan_user_data.surname) + ' - Should filter products by artisan slug', async () => {
        const artisanSlug = generateArtisanSlug(artisan_user_data.name, artisan_user_data.surname);
        const res = await request(app)
            .get(`/products/1?artisan=${artisanSlug}`)
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.products).toBeInstanceOf(Array);
        const productsOfArtisan = res.body.products.filter(p => p.artisan.name === artisan_user_data.name && p.artisan.surname === artisan_user_data.surname);
        expect(productsOfArtisan.length).toBeGreaterThanOrEqual(1);
        // Verifica che tra i prodotti filtrati ci sia anche il 'Vaso di Prova'
        const baseProductFound = productsOfArtisan.some(p => p.name === base_test_product_data.name);
        expect(baseProductFound).toBe(true);
    });

    test('GET /products/product/{artisan_slug}/{product_slug} - Should retrieve single product details using slugs', async () => {
        const artisanSlug = generateArtisanSlug(artisan_user_data.name, artisan_user_data.surname);
        // Utilizziamo lo slug del prodotto base creato nel beforeAll
        const productSlug = createdProductSlug; 
        
        const res = await request(app)
            .get(`/products/product/${artisanSlug}/${productSlug}`)
            .timeout(10000);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe(base_test_product_data.name);
        expect(res.body.images).toBeInstanceOf(Array);
        expect(res.body.images.length).toBeGreaterThan(0);
        expect(res.body.images[0]).toContain(uploadedImageId);
    });

    test('GET /products/product/{artisan_slug}/{product_slug} - Should return 404 for non-existent product', async () => {
        const artisanSlug = generateArtisanSlug(artisan_user_data.name, artisan_user_data.surname);
        const res = await request(app)
            .get(`/products/product/${artisanSlug}/non-existent-product-slug`)
            .timeout(10000);
        expect(res.statusCode).toBe(404);
    });
});

// Test modifica prodotto
describe('Product Update', () => {
    test('PUT /products/product/{slug} - Should allow an artisan to update their product', async () => {
        const productSlug = createdProductSlug; // Usiamo lo slug del prodotto base
        const updated_data = {
            name: 'Vaso di Prova Aggiornato',
            price: 24.99,
            quantity: 8,
            bio: 'Nuova bio prodotto', // Aggiunto per un esempio più completo
            categories: ['NuovaCategoria'] // Modifica categorie
        };
        const res = await request(app)
            .put(`/products/product/${productSlug}`)
            .set('Cookie', artisanJwtCookie)
            .send(updated_data)
            .set('Content-Type', 'application/json')
            .timeout(15000);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe(updated_data.name);
        expect(res.body.price).toBe(updated_data.price);
        expect(res.body.quantity).toBe(updated_data.quantity);
        // Verifica anche le categorie e il bio se il tuo PUT li restituisce
        // expect(res.body.categories[0].name).toBe(updated_data.categories[0]); // Se il backend restituisce il nome della categoria
    });

    test('PUT /products/product/{slug} - Should prevent updating a non-existent product', async () => {
        const res = await request(app)
            .put('/products/product/non-existent-slug')
            .set('Cookie', artisanJwtCookie)
            .send({ name: 'Invalid Update' })
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(403); // O 404 a seconda della logica specifica
    });

    test('PUT /products/product/{slug} - Should prevent non-artisans from updating a product', async () => {
        const productSlug = createdProductSlug; // Usiamo lo slug del prodotto base
        const res = await request(app)
            .put(`/products/product/${productSlug}`)
            .set('Cookie', customerJwtCookie)
            .send({ name: 'Attempted Update' })
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });
});

// Test segnalazione prodotto
describe('Product Reporting', () => {
    test('POST /products/report/{artisan_slug}/{product_slug} - Should allow a logged-in user to report a product', async () => {
        const artisanSlug = generateArtisanSlug(artisan_user_data.name, artisan_user_data.surname);
        const productSlug = createdProductSlug; // Usiamo lo slug del prodotto base
        const report_data = { note: 'Contenuto inappropriato.' };

        const res = await request(app)
            .post(`/products/report/${artisanSlug}/${productSlug}`)
            .set('Cookie', customerJwtCookie)
            .send(report_data)
            .set('Content-Type', 'application/json')
            .timeout(10000);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.ticket_id).toBeDefined();
    });

    test('POST /products/report/{artisan_slug}/{product_slug} - Should return 404 for reporting a non-existent product', async () => {
        const artisanSlug = generateArtisanSlug(artisan_user_data.name, artisan_user_data.surname);
        const res = await request(app)
            .post(`/products/report/${artisanSlug}/non-existent-product`)
            .set('Cookie', customerJwtCookie)
            .send({ note: 'Prodotto inesistente.' })
            .set('Content-Type', 'application/json')
            .timeout(10000);
        expect(res.statusCode).toBe(404);
    });
});

// Test eliminazione prodotto
describe('Product Deletion', () => {
    test('DELETE /products/product/{product_id} - Should allow an artisan to mark their product as removed', async () => {
        // Usiamo l'ID del prodotto base che è stato creato nel beforeAll
        const res = await request(app)
            .delete(`/products/product/${testProductId}`)
            .set('Cookie', artisanJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    test('DELETE /products/product/{product_id} - Should prevent deleting a non-existent or already deleted product (or not owned)', async () => {
        // Tentiamo di eliminare lo stesso prodotto di nuovo (dovrebbe fallire perché già eliminato)
        const res = await request(app)
            .delete(`/products/product/${testProductId}`)
            .set('Cookie', artisanJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(401); // Assumiamo 401 se non trovato o non autorizzato dopo la prima eliminazione
    });

    test('DELETE /products/product/{product_id} - Should prevent non-artisans/admins from deleting a product', async () => {
        // Creiamo un altro prodotto per testare la cancellazione da parte di un utente non autorizzato
        const temp_product_data = {
            name: 'Prodotto Temporaneo Per Cancellazione',
            description: 'Solo per test cancellazione non autorizzata.',
            short_description: 'Temp Del.',
            price: 10.00,
            categories: ['Altro'],
            images: [uploadedImageId],
            quantity: 1
        };
        let res = await request(app)
            .post('/products/product')
            .set('Cookie', artisanJwtCookie)
            .send(temp_product_data)
            .set('Content-Type', 'application/json')
            .timeout(15000);
        expect(res.statusCode).toBe(200);
        const tempProductId = res.body.id;

        res = await request(app)
            .delete(`/products/product/${tempProductId}`)
            .set('Cookie', customerJwtCookie) // Cliente tenta di eliminare
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });
});

// Test Dashboard (solo per Artigiani)
describe('Artisan Dashboard', () => {
    test('GET /products/dashboard/{days} - Should retrieve dashboard data for an artisan', async () => {
        const res = await request(app)
            .get('/products/dashboard/7') // Ultimi 7 giorni
            .set('Cookie', artisanJwtCookie)
            .timeout(15000);
        expect(res.statusCode).toBe(200);
        expect(res.body.sales).toBeDefined();
        expect(res.body.visits).toBeDefined();
        expect(res.body.refunds).toBeDefined();
        expect(res.body.performance).toBeDefined();
        expect(res.body.performance.sales).toBeDefined();
        expect(res.body.performance.visits).toBeDefined();
        expect(res.body.performance.refunds).toBeDefined();
    });

    test('GET /products/dashboard/{days} - Should return 403 for non-artisans', async () => {
        const res = await request(app)
            .get('/products/dashboard/7')
            .set('Cookie', customerJwtCookie)
            .timeout(10000);
        expect(res.statusCode).toBe(403);
    });

    test('GET /products/dashboard/{days} - Should handle -1 for all data', async () => {
        const res = await request(app)
            .get('/products/dashboard/-1')
            .set('Cookie', artisanJwtCookie)
            .timeout(15000);
        expect(res.statusCode).toBe(200);
        // Controlli simili al test precedente
    });
});
