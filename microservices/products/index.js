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

import authJWT from "./common_scripts/authJWT.js";
import sendError from "./common_scripts/sendError.js";
import { isBodyString, isPrice } from "./common_scripts/bodyTypeChecker.js";
import { getCategoryID, generateArtisanProductSlug } from "./scripts/utils.js";
import { debugPort } from "process";
import { get } from "http";

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

app.use(express.json());
app.use(cookieParser());

/*
app.listen(PORT, () => {
    console.log('Products service online');
});*/

app.get('/status', (req, res) => {
    res.send(JSON.stringify({ service: 'products', status: 'ok' }));
});
/**
 * API per ottenere tutti i prodotti
 */

const PER_PAGE=20;

const getProductThumbnail=async(idProduct)=>{
    let product_image = "https://localhost/src/img/placeholder.png";
    const product_image_res = await pool.query('SELECT "ID_image" FROM product_images WHERE "ID_product" = $1 AND position = 0', [idProduct]);
    if(product_image_res.rowCount > 0)
        product_image = 'https://localhost:3000/images/' + product_image_res.rows[0].ID_image;
    return product_image;  
}
const getCategories=async(idProduct)=>{
    let categories=[];
    const res=await pool.query("SELECT C.'ID', C.name, C.slug FROM product_categories AS PC INNER JOIN categories AS C ON C.'ID' = PC.'ID_category' WHERE PC.'ID_product' = $1 ORDER BY C.name ASC",[idProduct]);
    for(const row of res.rows){
        categories.push({
            id: row.ID,
            name: row.name,
            link: `/prodotti/categorie/${row.slug}`
        });
    }
    return categories;
}
const outputProduct=async(dbRow)=>{
    let img=await getProductThumbnail(dbRow.id);
    let categories=await getCategories(dbRow.id);
    return {
        id: dbRow.id,
        name: dbRow.pname,
        description: dbRow.short_description,
        price: (dbRow.price / 100),
        categories: categories,
        artisan: {
            name: dbRow.aname,
            surname: dbRow.surname,
            photoProfile: dbRow.artisan_propic_link,
            link: `/artigiani/${dbRow.aslug}`,
        },
        thumbnail:img,
        link: `/prodotti/${dbRow.aslug}/${dbRow.pslug}`
    }
}

app.get('/', async (req, res) => {
    try {
        let query=`SELECT p."ID" AS id, p.name AS pname, p.slug AS pslug, short_description, price, u.name AS aname, surname, id_profile_picture, u.slug AS aslug FROM products p JOIN users u ON artisan = u."ID" WHERE removed = false ORDER BY timestamp_last_update DESC`;

        const sql_res = await pool.query(query);

        const products = [];
        for(const row of sql_res.rows) {
            products.push(outputProduct(row));
        }

        res.json({products: recent_products, numberProducts: sql_res.rowCount});
    } catch (err) {
        console.error('Error fetching products:', err);
        sendError(res, 500);
    }
});

/**
 * API per ottenere i prodotti divisi per pagina con i filtri
 */
app.get("/:page",async(req,res)=>{
    let queryStandard=`SELECT p."ID" AS id, p.name AS pname, p.slug AS pslug, short_description, price, u.name AS aname, surname, id_profile_picture, u.slug AS aslug, COALESCE((
        SELECT SUM(r.quantity - o.quantity) FROM products_restock AS r
        INNER JOIN products_order AS o ON r."ID_product" = o."ID_product"
        WHERE r."ID_product" = p."ID"
        GROUP BY r."ID_product"
    ), 0) AS availability FROM products p 
    JOIN users u ON artisan = u."ID" 
    WHERE removed = false `;
    //applicazione dei filti
    if(req.query.filter){
        let filter=req.query.filter;
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
                if(filter.prezzi!=null){
                if(filter.prezzi.min!=null)
                    queryStandard+=`AND price >= ${filter.prezzi.min} `;
                if(filter.prezzi.max!=null)
                    queryStandard+=`AND price <= ${filter.prezzi.max} `;

            }
            if(filter.queryString!=null){
                queryStandard+=`AND p.name LIKE '%${filter.queryString}%' `;
            }
        }
        
    }
    if(req.query.order){
        let order=req.query.order;
        queryStandard+=`ORDER BY ${order} `;
    }else{
        queryStandard+=`ORDER BY timestamp_last_update DESC `;
    }

    //query di copia per ottenere tutti i prodotti con questi filtri
    let queryCopy=queryStandard;
    //applicazione delle pagine
    let page=req.params.page;
    let offset=(page-1)*PER_PAGE;
    queryStandard+=`LIMIT ${PER_PAGE} OFFSET ${offset} `;
    
    try{
        console.log("QUERY DA ESEGUIRE "+queryStandard);
        const sql_res=await pool.query(queryStandard);
        const products=[];
        for(const row of sql_res.rows){
            products.push(outputProduct(row));
        }
        //ottengo il numero delle pagine e il numero di prodotti totali
        const ris2=await pool.query(queryCopy);
        let pages=Math.ceil(ris2.rowCount/PER_PAGE);
        let numProducts=ris2.rowCount;
        res.json({products:products,pages:pages,numProducts:numProducts});
    }catch(err){
        console.error('Error fetching products:',err);
        sendError(res,500);
    }
});

app.post('/product', authJWT, async (req, res) => {
    const user_id = req.user.user_id;
    const { name, description, short_description, price, categories, images } = req.body;

    //validazione body
    if (!isBodyString(name, true) || !isBodyString(description, false) || !isBodyString(short_description, true) || !isPrice(price, false)) {
        sendError(res, 400);
        return;
    }

    //conversione del prezzo in centesimi
    const adjusted_price = Math.floor(price * 100);

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

            await client.query('COMMIT');

            res.json({
                id: product_info.ID,
                name: product_info.name,
                description: product_info.short_description,
                price: (product_info.price / 100),
                category: categories,
                product_image: images[0]
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.log('Error creating product: ' + err);
            sendError(res, 500);
        } finally {
            client.release();
        }
    } catch(err) {
        console.log('Error creating product: ' + err);
        sendError(res, 500);
    }
});

https.createServer(credentials, app).listen(PORT, () => {
  console.log("Microservice products listening on port "+debugPort);
});