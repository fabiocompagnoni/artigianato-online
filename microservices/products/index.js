/**
 * @version 1.0
 * @author Fabio Compagnoni
 */
import express from "express";
import {Pool} from "pg";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import https from 'https';
import fs from 'fs';

const PORT = 4000;

import authJWT, { getJWTinfo } from "./common_scripts/authJWT.js";
import sendError from "./common_scripts/sendError.js";
import { isBodyString, isPrice, isBodyInt } from "./common_scripts/bodyTypeChecker.js";
import { getRoleID, getOrderStatusID, getTicketStatusID, getProductThumbnail, getArtisanReviews } from './common_scripts/utils.js';
import { getCategoryID, generateArtisanProductSlug } from "./scripts/utils.js";

const app = express();

const privateKey = fs.readFileSync('/certs/server.key', 'utf8');
const certificate = fs.readFileSync('/certs/server.crt', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate
};

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});


// Configurazione CORS più robusta per lo sviluppo
const allowedOrigins = [
  'http://localhost:3000', // Il tuo backend stesso, se ti serve fare richieste a se stesso
  'http://localhost',      // Per casi in cui il browser non specifichi la porta
  'https://localhost',     // Per HTTPS (anche se in dev è meno comune)
  'http://127.0.0.1',
  'http://localhost:8000'  // Server di debug
];

app.use(cors({
  origin: function (origin, callback) {
    // Permetti le richieste senza origine (es. da Postman o curl)
    // E permetti le origini nella lista consentita
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin === 'null') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Necessario per l'invio di cookie (es. httpOnly)
}));

app.enable('trust proxy');

app.use(express.json());
app.use(cookieParser());

app.get('/status', (req, res) => {
    res.json({ service: 'products', status: 'ok' });
});
/**
 * API per ottenere tutti i prodotti
 */

const PER_PAGE=20;

const getProductImages=async(idProduct)=>{
    const product_images = [];
    const product_images_res = await pool.query('SELECT "ID_image" FROM product_images WHERE "ID_product" = $1', [idProduct]);
    for(const image of product_images_res.rows)
        product_images.push({
            url:'https://localhost:3000/images/' + image.ID_image,
            id:image.ID_image
        });
    return product_images;
}
const getCategories=async(idProduct)=>{
    let categories=[];
    const res=await pool.query('SELECT C."ID", C.name, C.slug FROM product_categories AS PC INNER JOIN categories AS C ON C."ID" = PC."ID_category" WHERE PC."ID_product" = $1 ORDER BY C.name ASC',[idProduct]);
    for(const row of res.rows){
        categories.push({
            id: row.ID,
            name: row.name,
            link: `/prodotti/categorie/${row.slug}`
        });
    }
    return categories;
}
const outputProduct=async(dbRow, single_product=false)=>{
    let categories=await getCategories(dbRow.id);
    const artisan_reviews = await getArtisanReviews(dbRow.id, pool);
    const obj = {
        id: dbRow.id,
        name: dbRow.pname,
        short_description: dbRow.short_description,
        description:dbRow.description,
        price: (dbRow.price / 100),
        categories: categories,
        timestamp_update: dbRow.timestamp_update,
        timestamp_creation: dbRow.timestamp_creation,
        artisan: {
            name: dbRow.aname,
            surname: dbRow.surname,
            photoProfile: dbRow.id_profile_picture ? 'https://localhost:3000/images/' + dbRow.id_profile_picture : null,
            link: `/artigiani/${dbRow.aslug}`,
            reviews_total: artisan_reviews.reviews_total,
            reviews_avg: artisan_reviews.reviews_avg
        },
        link: `/prodotti/${dbRow.aslug}/${dbRow.pslug}`,
        quantity: parseInt(dbRow.availability),
        visits: parseInt(dbRow.visits)
    }

    if(single_product) {
        obj.images = await getProductImages(dbRow.id);
        obj.short_description = dbRow.short_description;
        obj.description = dbRow.description;
    }
    else {
        obj.thumbnail = await getProductThumbnail(dbRow.id, pool);
        obj.description = dbRow.short_description;
    }

    return obj;
}

const base_query = 'SELECT p."ID" AS id, p.name AS pname, p.slug AS pslug, short_description, price, quantity AS availability, visits, u.name AS aname, surname, id_profile_picture, u.slug AS aslug FROM products_view p JOIN users u ON artisan = u."ID" WHERE 1 = 1 ';

//come la query sopra ma con l'aggiunta di "description"
const single_product_query = 'SELECT p."ID" AS id, p.name AS pname, p.slug AS pslug, description, short_description, price, quantity AS availability, timestamp_last_update, timestamp_creation, visits, u.name AS aname, surname, id_profile_picture, u.slug AS aslug FROM products_view p JOIN users u ON artisan = u."ID" WHERE u.slug = $1 AND p.slug = $2';

//per ottenere i prodotti più recenti
app.get('/', async (req, res) => {
    try {
        const sql_res = await pool.query(base_query + 'LIMIT 20');

        const products = await Promise.all(sql_res.rows.map(row => outputProduct(row)));

        res.json({products: products, numberProducts: sql_res.rowCount});
    } catch (err) {
        console.error('Error fetching products:', err);
        sendError(res, 500);
    }
});

app.get('/product/:artisan_slug/:product_slug', async (req, res) => {
    const query = single_product_query;

    try {
        if(!isBodyString(req.params.artisan_slug, true) || !isBodyString(req.params.product_slug, true)) {
            sendError(res, 400);
            return;
        }

        const sql_res = await pool.query(query, [req.params.artisan_slug, req.params.product_slug]);

        if(sql_res.rowCount > 0) {
            const product = await outputProduct(sql_res.rows[0], true);

            //aggiungiamo una visita nel db
            try {
                const product_id = sql_res.rows[0].id;
                let viewer = null;
                const jwt_info = getJWTinfo(req);
                if(jwt_info)
                    viewer = jwt_info.user_id;
                const ip_address = req.ip;

                await pool.query('INSERT INTO product_visits("ID_product", id_user, ip_address) VALUES ($1, $2, $3)', [product_id, viewer, ip_address]);
            } catch(err) {
                console.error('Error adding user visit to product: ' + err);
            }

            res.json(product);
        }
        else
            sendError(res, 404);
    } catch (err) {
        console.error('Error adding fetching single product info: ' + err);
        sendError(res, 500);
    }
});

//per segnalare un oggetto
app.post('/report/:artisan_slug/:product_slug', authJWT, async (req, res) => {
    try {
        if(!req.body || !req.body.note || !isBodyString(req.body.note, true) ||
            !isBodyString(req.params.artisan_slug, true) || !isBodyString(req.params.product_slug, true)) {
            sendError(res, 400);
            return;
        }

        const sql_res = await pool.query(single_product_query, [req.params.artisan_slug, req.params.product_slug]);

        if(sql_res.rowCount > 0) {
            const STATUS_TICKET_APERTO_ID = await getTicketStatusID('Aperto', pool);
            const product_id = sql_res.rows[0].id;

            const sql_res2 = await pool.query(
                'INSERT INTO ticket_products(id_product, id_user, status, note) VALUES($1, $2, $3, $4) RETURNING "ID"',
                [product_id, req.user.user_id, STATUS_TICKET_APERTO_ID, req.body.note]
            );

            res.json({ticket_id: sql_res2.rows[0].ID});
        }
        else //il prodotto non è stato trovato
            sendError(res, 404);
    } catch (err) {
        console.error('Error reporting product: ' + err);
        sendError(res, 500);
    }
});

app.post('/product', authJWT, async (req, res) => {
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);

        if(req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        if(!req.body || !req.body.name || !isBodyString(req.body.name, true)
        || !req.body.description || !isBodyString(req.body.description, false)
        || !req.body.short_description || !isBodyString(req.body.short_description, true)
        || !req.body.price || !isPrice(req.body.price, true)
        || !req.body.categories || !Array.isArray(req.body.categories)
        || !req.body.images || !Array.isArray(req.body.images)
        || !req.body.quantity || !isBodyInt(req.body.quantity, true)) {
            sendError(res, 400);
            return;
        }

        const user_id = req.user.user_id;
        const { name, description, short_description, price, categories, images, quantity } = req.body;

        //conversione del prezzo in centesimi
        const adjusted_price = Math.round(price * 100);

        if(!Array.isArray(categories) || !Array.isArray(images)) {
            sendError(res, 400);
            return;
        }

        try {
            //il programma proseguirà solo una volta dopo aver completato tutte le promise
            const categories_ids = await Promise.all(categories.map(c => getCategoryID(c, pool)));

            const slug = await generateArtisanProductSlug(user_id, name, pool);

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                const sql_res = await client.query('INSERT INTO products(name, slug, description, short_description, price, artisan) VALUES($1, $2, $3, $4, $5, $6) RETURNING *', [
                    name,
                    slug,
                    description,
                    short_description,
                    adjusted_price,
                    user_id
                ]);

                const product_info = sql_res.rows[0];

                for(const cat_id of categories_ids)
                    await client.query('INSERT INTO product_categories("ID_category", "ID_product") VALUES ($1, $2)', [cat_id, product_info.ID]);

                for(const [position, image_id] of images.entries())
                    await client.query('INSERT INTO product_images("ID_product", "ID_image", position) VALUES ($1, $2, $3)', [product_info.ID, image_id, position]);

                await client.query('INSERT INTO products_restock("ID_product", quantity) VALUES ($1, $2)', [product_info.ID, quantity]);

                await client.query('COMMIT');

                res.status(200).json({
                    id: product_info.ID,
                    name: product_info.name,
                    description: product_info.short_description,
                    price: product_info.price / 100,
                    category: categories,
                    product_image: images[0],
                    quantity: quantity,
                    slug: slug
                });
            } catch (err) {
                await client.query('ROLLBACK');
                if (err.code === '23503' || err.code === '22P02') // foreign key violation (id immagine non presente) o id non valido
                    sendError(res, 521);
                else {
                    console.error('Error creating product: ' + err);
                    sendError(res, 500);
                }
            } finally {
                client.release();
            }
        } catch(err) {
            console.error('Error creating product: ' + err);
            sendError(res, 500);
        }
    } catch (err) {
        console.error('Error creating product: ' + err);
        sendError(res, 500);
    }
});

//edit product
app.put('/product/:slug', authJWT, async (req, res) => {
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        if(req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        if(!req.params || !req.params.slug || !isBodyString(req.params.slug, true)) {
            sendError(res, 400);
            return;
        }

        const product_slug = req.params.slug;

        const user_id = req.user.user_id;
        const edits = req.body;

        if (typeof edits === 'undefined' || Object.keys(edits).length === 0) {
            sendError(res, 400); // Bad request se non ci sono edits
            return;
        }

        //controllo che l'utente abbia accesso al prodotto
        const check_query_result = await pool.query('SELECT "ID" FROM products WHERE slug = $1 AND artisan = $2', [product_slug, user_id]);
        if(check_query_result.rowCount === 0) {
            sendError(res, 403);
            return;
        }

        const product_id = check_query_result.rows[0].ID;

        const { name, description, short_description, price, categories, images, quantity } = edits;

        //controlla che, se la categoria è presente, sia conforme
        if (typeof(name) !== 'undefined' && !isBodyString(name, true) ||
        typeof(description) !== 'undefined' && !isBodyString(description, false) ||
        typeof(short_description) !== 'undefined' && !isBodyString(short_description, true) ||
        typeof(price) !== 'undefined' && !isPrice(price, false) ||
        typeof(quantity) !== 'undefined' && !isBodyInt(quantity, true)) {
            sendError(res, 400);
            return;
        }

        const actions = ['name', 'description', 'short_description'];

        const client = await pool.connect();
        try {
            await client.query('BEGIN'); // Inizia la transazione

            const response = { password_changed: false };
            for (const act of actions) {
                if (typeof edits[act] !== 'undefined') {
                    const sql_res = await client.query(
                        `UPDATE products SET ${act} = $1 WHERE "ID" = $2 AND artisan = $3 RETURNING ${act}`,
                        [edits[act], product_id, user_id]
                    );
                    if (sql_res.rowCount > 0) {
                        response[act] = sql_res.rows[0][act];
                    }
                }
            }

            if (typeof price !== 'undefined') {
                const adjusted_price = Math.round(price * 100);
                await client.query(
                    'UPDATE products SET price = $1 WHERE "ID" = $2 AND artisan = $3',
                    [adjusted_price, product_id, user_id]
                );
                response.price = price;
            }

            if (typeof quantity !== 'undefined') {
                await client.query(
                    'INSERT INTO products_restock("ID_product", quantity) VALUES ($1, $2)',
                    [product_id, quantity]
                );
                response.quantity = quantity;
            }

            if (typeof categories !== 'undefined') {
                await client.query(
                    'DELETE FROM product_categories WHERE "ID_product" = $1',
                    [product_id]
                );

                const categories_ids = await Promise.all(categories.map(c => getCategoryID(c, pool)));

                for(const cat_id of categories_ids)
                    await client.query(
                        'INSERT INTO product_categories("ID_category", "ID_product") VALUES ($1, $2)',
                        [cat_id, product_id]
                    );
            }

            if (typeof images !== 'undefined') {
                await client.query(
                    'DELETE FROM product_images WHERE "ID_product" = $1',
                    [product_id]
                );

                for(const [position, image_id] of images.entries())
                    await client.query(
                        'INSERT INTO product_images("ID_product", "ID_image", position) VALUES ($1, $2, $3)',
                        [product_id, image_id, position]
                    );
            }

            await client.query('COMMIT'); // Commette la transazione

            res.status(200).json(response);
        } catch (err) {
            console.error('Error updating product: ', err);
            sendError(res, 500);
            await client.query('ROLLBACK'); // Fa il rollback in caso di errore
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error updating product: ' + err);
        sendError(res, 500);
    }
});

app.post("/restock/:slugProduct",authJWT, async(req, res)=>{
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        if(req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const slugProduct = req.params.slugProduct;

        if(!isBodyString(slugProduct, true)) {
            sendError(res, 400);
            return;
        }

        const { quantity } = req.body;

        if(!isBodyInt(quantity, true)) {
            sendError(res, 400);
            return;
        }

        // Recupera l'ID del prodotto tramite slug e verifica che appartenga all'artigiano autenticato
        const productRes = await pool.query(
            'SELECT "ID" FROM products WHERE slug = $1 AND artisan = $2 AND removed = false',
            [slugProduct, req.user.user_id]
        );
        if(productRes.rowCount === 0) {
            sendError(res, 404);
            return;
        }
        const productId = productRes.rows[0].ID;

        await pool.query('INSERT INTO products_restock("ID_product", quantity) VALUES($1, $2)', [productId, quantity]);
        //ottenimento quantita aggiornata
        const sql_res2 = await pool.query('SELECT quantity FROM products_view WHERE "ID" = $1', [productId]);
        res.json({quantity: sql_res2.rows[0].quantity});
    } catch(err) {
        console.error('Error restocking product: ' + err);
        sendError(res, 500);
    }
});

//delete product (lo marchia come eliminato nel db)
app.delete('/product/:product_slug', authJWT, async (req, res) => {
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        const ADMIN_ROLE_ID = await getRoleID('admin', pool);
        if (req.user.user_role_id !== ARTISAN_ROLE_ID && req.user.user_role_id !== ADMIN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const { product_slug } = req.params;
        if (!isBodyString(product_slug, true)) {
            sendError(res, 400);
            return;
        }

        // Recupera l'ID del prodotto tramite slug
        let productQuery = 'SELECT "ID", artisan FROM products WHERE slug = $1 AND removed = false';
        const productRes = await pool.query(productQuery, [product_slug]);
        if (productRes.rowCount === 0) {
            sendError(res, 404);
            return;
        }
        const productId = productRes.rows[0].ID;
        const productArtisan = productRes.rows[0].artisan;

        // Se l'utente non è admin, verifica che abbia accesso al prodotto
        if (req.user.user_role_id === ARTISAN_ROLE_ID && req.user.user_id !== productArtisan) {
            sendError(res, 403);
            return;
        }

        const sql_res = await pool.query(
            'UPDATE products SET removed = true WHERE "ID" = $1 AND removed = false',
            [productId]
        );

        if (sql_res.rowCount > 0)
            res.json({ status: 'ok' });
        else
            sendError(res, 401);
    } catch (err) {
        console.error('Error deleting product: ' + err);
        sendError(res, 500);
    }
});

/**
 * API per aggiornare la posizione di un immagine 
*/

app.post("/productImage/changePosition",authJWT, async(req, res)=>{
    try {
        const { product_id, image_id, new_position } = req.body;

        if (
            !isBodyInt(product_id, false) ||
            !isBodyInt(image_id, false) ||
            !isBodyInt(new_position, false)
        ) {
            sendError(res, 400);
            return;
        }

        // Verifica che l'immagine appartenga al prodotto
        const imgRes = await pool.query(
            'SELECT position FROM product_images WHERE "ID_product" = $1 AND "ID_image" = $2',
            [product_id, image_id]
        );
        if (imgRes.rowCount === 0) {
            sendError(res, 404);
            return;
        }
        const old_position = imgRes.rows[0].position;

        // Ottieni il numero totale di immagini per il prodotto
        const countRes = await pool.query(
            'SELECT COUNT(*) FROM product_images WHERE "ID_product" = $1',
            [product_id]
        );
        const total_images = parseInt(countRes.rows[0].count);

        if (new_position < 0 || new_position >= total_images) {
            sendError(res, 400);
            return;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (new_position > old_position) {
                // Sposta tutte le immagini tra old_position+1 e new_position indietro di 1
                await client.query(
                    `UPDATE product_images
                     SET position = position - 1
                     WHERE "ID_product" = $1 AND position > $2 AND position <= $3`,
                    [product_id, old_position, new_position]
                );
            } else if (new_position < old_position) {
                // Sposta tutte le immagini tra new_position e old_position-1 avanti di 1
                await client.query(
                    `UPDATE product_images
                     SET position = position + 1
                     WHERE "ID_product" = $1 AND position >= $2 AND position < $3`,
                    [product_id, new_position, old_position]
                );
            }

            // Aggiorna la posizione dell'immagine selezionata
            await client.query(
                `UPDATE product_images
                 SET position = $1
                 WHERE "ID_product" = $2 AND "ID_image" = $3`,
                [new_position, product_id, image_id]
            );

            await client.query('COMMIT');
            res.json({ status: 'ok' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error changing image position:', err);
            sendError(res, 500);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error changing image position:', err);
        sendError(res, 500);
    }
});

app.delete("/productImage/:product_id/:image_id",authJWT, async(req, res)=>{
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        if (req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }
        console.log(req.params);
        const { product_id, image_id } = req.params;

        if (!isBodyInt(product_id, false) || image_id==undefined) {
            sendError(res, 400);
            return;
        }

        // Verifica che il prodotto appartenga all'utente autenticato
        const productRes = await pool.query(
            'SELECT "ID" FROM products WHERE "ID" = $1 AND artisan = $2',
            [product_id, req.user.user_id]
        );
        if (productRes.rowCount === 0) {
            sendError(res, 403);
            return;
        }

        // Verifica che l'immagine appartenga al prodotto
        const imgRes = await pool.query(
            'SELECT position FROM product_images WHERE "ID_product" = $1 AND "ID_image" = $2',
            [product_id, image_id]
        );
        if (imgRes.rowCount === 0) {
            sendError(res, 404);
            return;
        }
        const old_position = imgRes.rows[0].position;

        // Elimina l'immagine
        await pool.query(
            'DELETE FROM product_images WHERE "ID_product" = $1 AND "ID_image" = $2',
            [product_id, image_id]
        );

        // Aggiorna la posizione delle immagini successive
        await pool.query(
            'UPDATE product_images SET position = position - 1 WHERE "ID_product" = $1 AND position > $2',
            [product_id, old_position]
        );

        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Error deleting product image:', err);
        sendError(res, 500);
    }
});

app.get("/categories",async(req, res)=>{
    try {
        const result = await pool.query('SELECT name, slug FROM categories ORDER BY name ASC');
        let selectedCategories = [];
        if (req.query && req.query.product_slug) {
            const productRes = await pool.query(
                'SELECT C.slug FROM product_categories AS PC INNER JOIN categories AS C ON C."ID" = PC."ID_category" INNER JOIN products AS P ON P."ID" = PC."ID_product" WHERE P.slug = $1',
                [req.query.product_slug]
            );
            selectedCategories = productRes.rows.map(row => row.slug);
        }
        const categoriesWithSelected = result.rows.map(cat => ({
            ...cat,
            selected: selectedCategories.includes(cat.slug)
        }));
        res.json({ categories: categoriesWithSelected });
    } catch (err) {
        console.error('Error fetching categories:', err);
        sendError(res, 500);
    }
});

// Genera uno slug unico per una categoria, verificando che non esista già nel DB
const generateCategorySlug = async (categoryName, pool) => {
    // Funzione per generare lo slug base
    const slugify = str =>
        str
            .toString()
            .normalize('NFD') // rimuove accenti
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-') // sostituisce tutto ciò che non è alfanumerico con -
            .replace(/^-+|-+$/g, ''); // rimuove - iniziali/finali

    let baseSlug = slugify(categoryName);
    let slug = baseSlug;
    let counter = 1;

    // Verifica se esiste già una categoria con questo slug
    // Se sì, aggiunge un numero incrementale
    while (true) {
        const res = await pool.query('SELECT 1 FROM categories WHERE slug = $1', [slug]);
        if (res.rowCount === 0) break;
        slug = `${baseSlug}-${counter++}`;
    }

    return slug;
};

/**
 * API per inserire una nuova categoria
 */
app.post("/category",authJWT, async(req, res)=>{
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        if(req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        const { name } = req.body;

        if(!isBodyString(name, true)) {
            sendError(res, 400);
            return;
        }

        const slug = await generateCategorySlug(name, pool);

        const sql_res = await pool.query('INSERT INTO categories(name, slug) VALUES($1, $2) RETURNING *', [name, slug]);

        res.json({
            id: sql_res.rows[0].ID,
            name: sql_res.rows[0].name,
            slug: sql_res.rows[0].slug
        });
    } catch (err) {
        console.error('Error creating category: ' + err);
        sendError(res, 500);
    }
});


function getPercentage(total, last2w) {
    if(total === 0)
        return 0;
    return Math.round(last2w / total * 1000) / 10;
}

function getMonthDay(date) {
	date = new Date(date)
	return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
}

function getLXDObject(days) {
	const today = new Date();
	const obj = {};
	for(let i = 0; i <= days; i++) {
		const prev_day = new Date().setDate(today.getDate() - i);
		obj[getMonthDay(prev_day)] = 0;
	}

	return obj;
}

//per ottenere le informazioni per la dashboard artigiani
app.get('/dashboard/:days', authJWT, async (req, res) => {
    try {
        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);
        if(req.user.user_role_id !== ARTISAN_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        if(!req.params || !req.params.days || !isBodyInt(req.params.days, false)) {
            sendError(res, 400);
            return;
        }

        const ANNULLATO_STATUS_ID = await getOrderStatusID('Annullato', pool);
        const RIMBORSATO_STATUS_ID = await getOrderStatusID('Rimborsato', pool);

        let days = req.params.days;

        //se days è negativo, calcoliamo la data più lontana
        if(days < 0) {
            let sql_res = await pool.query(
                'SELECT timestamp_creation FROM products WHERE artisan = $1 ORDER BY timestamp_creation ASC LIMIT 1',
                [req.user.user_id]
            );

            if(sql_res.rowCount > 0) {
                const old_date = new Date(getMonthDay(sql_res.rows[0].timestamp_creation));
                const diff = Math.round((new Date(getMonthDay(new Date())) - old_date) / (1000 * 60 * 60 * 24));
                days = diff;
            }
            else
                days = 0;
        }

        //timestamp di x giorni fa
        const date_x_days_ago = new Date(getMonthDay(new Date().setDate(new Date().getDate() - days)));
        const performance_sales = getLXDObject(days);
        const performance_visits = getLXDObject(days);
        const performance_refunds = getLXDObject(days);

        //info vendite
        let sql_res = await pool.query(
            'SELECT quantity, single_product_price, timestamp_order FROM products_order JOIN orders o ON o."ID" = "ID_order" JOIN products p ON p."ID" = "ID_product" WHERE status <> $1 AND status <> $2 AND artisan = $3',
            [ANNULLATO_STATUS_ID, RIMBORSATO_STATUS_ID, req.user.user_id]
        );

        const total_orders = sql_res.rowCount;
        let total_gain = 0;
        let total_gain_lxd = 0;

        for(const row of sql_res.rows) {
            const total_price = row.quantity * row.single_product_price / 100;
            total_gain += total_price;
            if(new Date(getMonthDay(row.timestamp_order)) >= date_x_days_ago) {
                performance_sales[getMonthDay(row.timestamp_order)] += total_price;
                total_gain_lxd += total_price;
            }
        }

        const sales = {
            total_orders,
            total_gain,
            total_gain_last_days: total_gain_lxd,
            total_gain_last_days_percent: getPercentage(total_gain, total_gain_lxd)
        };

        //info visite
        sql_res = await pool.query(
            'SELECT timestamp_visit FROM product_visits JOIN products ON "ID" = "ID_product" WHERE artisan = $1',
            [req.user.user_id]
        );

        const total_visits = sql_res.rowCount;
        let total_visits_lxd = 0;

        for(const row of sql_res.rows) {
            if(new Date(getMonthDay(row.timestamp_visit)) >= date_x_days_ago) {
                performance_visits[getMonthDay(row.timestamp_visit)]++;
                total_visits_lxd++;
            }
        }

        const visits = {
            total_visits,
            total_visits_last_days: total_visits_lxd,
            total_visits_last_days_percent: getPercentage(total_visits, total_visits_lxd)
        }

        //info rimborsi
        sql_res = await pool.query(
            'SELECT quantity, timestamp_order FROM products_order JOIN orders o ON o."ID" = "ID_order" JOIN products p ON p."ID" = "ID_product" WHERE status = $1 AND artisan = $2',
            [RIMBORSATO_STATUS_ID, req.user.user_id]
        );

        const total_refunds = sql_res.rowCount;
        let total_refunds_lxd = 0;

        for(const row of sql_res.rows) {
            if(new Date(getMonthDay(row.timestamp_order)) >= date_x_days_ago) {
                performance_refunds[getMonthDay(row.timestamp_order)] += row.quantity;
                total_refunds_lxd += row.quantity;
            }
        }

        const refunds = {
            total_refunds,
            total_refunds_last_days: total_refunds_lxd,
            total_refunds_last_days_percent: getPercentage(total_refunds, total_refunds_lxd)
        };
        
        res.json({
            sales,
            visits,
            refunds,
            performance: {
                sales: performance_sales,
                visits: performance_visits,
                refunds: performance_refunds
            }
        });
    } catch (err) {
        console.error('Error fetching dashboard data: ' + err);
        sendError(res, 500);
    }
});

/**
 * API per ottenere i prodotti divisi per pagina con i filtri
 */
app.get("/:page",async(req,res)=>{
    let queryStandard=base_query;

    let query_placeholder_num = 1;
    let query_placeholder_values = [];

    //applicazione dei filti
    if(req.query){
        let filter = req.query;
        
        if(filter.artisan!=null){
            //artisan products only
            queryStandard+=`AND u.slug = '${filter.artisan}' `;
        }
        if(filter.disponibilita!=null){
            if(filter.disponibilita.length==1){
                    if(filter.disponibilita[0]==0)
                        queryStandard+=`AND availability = 0 `;
                    else
                        queryStandard+=`AND availability > 0 `;
                }
            }
        if(filter.prezzi!=null){
            if(filter.prezzi.min!=null) {
                queryStandard+=`AND price >= $${query_placeholder_num++} `;
                query_placeholder_values.push(filter.prezzi.min);
            }
            if(filter.prezzi.max!=null) {
                queryStandard+=`AND price <= $${query_placeholder_num++} `;
                query_placeholder_values.push(filter.prezzi.max);
            }

        }
        if(filter.queryString!=null){
            queryStandard+=`AND p.name LIKE $${query_placeholder_num++} `;
            query_placeholder_values.push('%' + filter.queryString + '%');
        }
        
    }
    if(req.query.order){
        queryStandard+=`ORDER BY $${query_placeholder_num++} `;
        query_placeholder_values.push(req.query.order);
    }else{
        queryStandard+=`ORDER BY timestamp_last_update DESC `;
    }

    //query di copia per ottenere tutti i prodotti con questi filtri
    let queryCopy=queryStandard;
    //applicazione delle pagine
    let page=req.params.page;
    if(!isBodyInt(page)) {
        sendError(res, 404);
        return;
    }
    let offset=(page-1)*PER_PAGE;
    queryStandard+=`LIMIT ${PER_PAGE} OFFSET ${offset} `;
    
    try{
        console.log("QUERY DA ESEGUIRE "+queryStandard);
        console.log("PLACEHOLDER UTILIZZATI "+query_placeholder_values);
        const sql_res=await pool.query(queryStandard, query_placeholder_values);
        
        const products = await Promise.all(sql_res.rows.map(row => outputProduct(row)));
        //ottengo il numero delle pagine e il numero di prodotti totali
        const ris2=await pool.query(queryCopy, query_placeholder_values);
        let pages=Math.ceil(ris2.rowCount/PER_PAGE);
        let numProducts=ris2.rowCount;
        res.json({products:products,pages:pages,numProducts:numProducts});
    }catch(err){
        console.error('Error fetching products:',err);
        sendError(res,500);
    }
});

/**
 * API per ottenere prodotti dello stesso artigiano ma diversi da quello corrente
 */

app.get("/correlated/:slugArtisan/:slugProduct",async(req,res)=>{
    try {
        const { slugArtisan, slugProduct } = req.params;
        if (!isBodyString(slugArtisan, true) || !isBodyString(slugProduct, true)) {
            sendError(res, 400);
            return;
        }

        const sql_res = await pool.query(
            base_query +
            'AND u.slug = $1 AND p.slug <> $2 ORDER BY timestamp_last_update DESC LIMIT 4',
            [slugArtisan, slugProduct]
        );

        const products = await Promise.all(sql_res.rows.map(async dbRow => {
            const categories = await getCategories(dbRow.id);
            return {
                id: dbRow.id,
                name: dbRow.pname,
                short_description: dbRow.short_description,
                description: dbRow.description,
                price: (dbRow.price / 100),
                categories: categories,
                timestamp_update: dbRow.timestamp_update,
                timestamp_creation: dbRow.timestamp_creation,
                link: `/prodotti/${dbRow.aslug}/${dbRow.pslug}`
            };
        }));
        res.json({ products });
    } catch (err) {
        console.error('Error fetching correlated products:', err);
        sendError(res, 500);
    }
});

/**
 * API per ottenere prodotti simili
 */
app.get("/similar/:slugProduct", async (req, res) => {
    try {
        const { slugProduct } = req.params;
        if (!isBodyString(slugProduct, true)) {
            sendError(res, 400);
            return;
        }

        // 1. Ottieni info prodotto di riferimento
        const productRes = await pool.query(
            'SELECT "ID", price FROM products WHERE slug = $1 AND removed = false',
            [slugProduct]
        );
        if (productRes.rowCount === 0) {
            sendError(res, 404);
            return;
        }
        const { ID: productId, price } = productRes.rows[0];

        // 2. Ottieni categorie del prodotto
        const catRes = await pool.query(
            'SELECT "ID_category" FROM product_categories WHERE "ID_product" = $1',
            [productId]
        );
        const categoryIds = catRes.rows.map(row => row.ID_category);
        if (categoryIds.length === 0) {
            // Se non ha categorie, cerca solo per prezzo simile
            categoryIds.push(-1); // Nessuna categoria, non troverà nulla con IN
        }

        // 3. Trova prodotti simili per categoria o prezzo (±20%)
        const minPrice = Math.round(price * 0.8);
        const maxPrice = Math.round(price * 1.2);

        const similarRes = await pool.query(
            `
            ${base_query}
            AND p."ID" <> $1
            AND (
                p."ID" IN (
                    SELECT "ID_product" FROM product_categories WHERE "ID_category" = ANY($2)
                )
                OR (p.price BETWEEN $3 AND $4)
            )
            ORDER BY
                (
                    SELECT COUNT(*) FROM product_categories pc
                    WHERE pc."ID_product" = p."ID" AND pc."ID_category" = ANY($2)
                ) DESC,
                ABS(p.price - $5) ASC,
                timestamp_last_update DESC
            LIMIT 8
            `,
            [productId, categoryIds, minPrice, maxPrice, price]
        );

        // Per ogni prodotto, restituisci solo i campi richiesti
        const products = await Promise.all(similarRes.rows.map(async row => {
            // Ottieni categorie
            const categories = await getCategories(row.id);
            // Ottieni recensioni artigiano
            const artisan_reviews = await getArtisanReviews(row.id, pool);
            return {
                id: row.id,
                name: row.pname,
                short_description: row.short_description,
                description: row.description,
                price: (row.price / 100),
                categories: categories,
                timestamp_update: row.timestamp_update,
                timestamp_creation: row.timestamp_creation,
                artisan: {
                    name: row.aname,
                    surname: row.surname,
                    photoProfile: row.id_profile_picture ? 'https://localhost:3000/images/' + row.id_profile_picture : null,
                    link: `/artigiani/${row.aslug}`,
                    reviews_total: artisan_reviews.reviews_total,
                    reviews_avg: artisan_reviews.reviews_avg
                },
                link: `/prodotti/${row.aslug}/${row.pslug}`
            };
        }));
        res.json({ products });
    } catch (err) {
        console.error('Error fetching similar products:', err);
        sendError(res, 500);
    }
});

https.createServer(credentials, app).listen(PORT, () => {
  console.log("Microservice products online");
});