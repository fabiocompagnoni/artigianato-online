import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import cookieParser from 'cookie-parser';
import nodemailer from 'nodemailer';

import https from 'https';
import fs from 'fs';
import jwt from 'jsonwebtoken';

import sendError from './common_scripts/sendError.js';
import { generatePasswordHash, comparePassword, checkPasswordFormat, checkEmailFormat, generateUserSlug } from './scripts/util.js';
import authJWT from './common_scripts/authJWT.js';
import { getRoleID, getArtisanReviews } from './common_scripts/utils.js';
import { sendUserData } from './scripts/userScripts.js';
import { isBodyString, isBodyInt } from "./common_scripts/bodyTypeChecker.js";

import passport from 'passport';
import configurePassport from "./passportSetup.js";
import session from "express-session";

const PER_PAGE = 20;

const emailer = process.env.NODE_ENV === 'test' ? null : nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GOOGLE_EMAIL,
        pass: process.env.GOOGLE_EMAIL_TOKEN
    },
	tls: {
        // DO NOT DO THIS IN PRODUCTION
        rejectUnauthorized: false
    }
});

async function sendRecoveryEmail(user_email, user_name, otp) {
    await emailer.sendMail({
        to: user_email,
        subject: 'Artigianto Online - OTP Recupero password',
        html: `Gentile ${user_name},<br>
        Le inviamo questa email a seguito della sua richiesta di recupero password,
        se non ha effettuato questa richiesta può ignorare l'email.<br><br>
        <h3>Codice OTP: ${otp}</h3>
        Questo codice sarà valido per i prossimi 15 minuti.<br><br><br>
        Il team di Artigianato Online`
    });
};

const app = express();
const port = 4000;

const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({ connectionString: DATABASE_URL });


const privateKey = fs.readFileSync('/certs/server.key', 'utf8');
const certificate = fs.readFileSync('/certs/server.crt', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate
};

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

if(process.env.NODE_ENV !== 'test')
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie:{
            secure:true,
            httpOnly:true,
            sameSite:'None',
            maxAge: 24 * 60 * 60 * 1000
        }
    }));


app.use(express.json());
app.use(cookieParser());

// Health check endpoint (prima definizione)
app.get('/', (req, res) => {
    res.json({ service: 'users', status: 'ok' });
});


// Routes
app.post('/user', async (req, res) => {
    if (!req.body || !req.body.email || !req.body.name || !req.body.surname || !req.body.password, !req.body.role) {
        sendError(res, 400); // Bad request se mancano campi
        return;
    }

    const { email, name, surname, password, role } = req.body;

    if(role !== 'customer' && role !== 'artisan') {
        sendError(res, 522);
        return;
    }

    
    let slug = '';
    try {
        slug = await generateUserSlug(name, surname, pool);
    } catch (e) {
        sendError(res, 518);
        return;
    }

    if (!checkPasswordFormat(password)) {
        sendError(res, 516);
        return;
    }

    if (!checkEmailFormat(email)) {
        sendError(res, 517);
        return;
    }

    const password_hash = generatePasswordHash(password);

    let slug_error = false;
    do {
        try {
            slug_error = false;

            const CUSTOMER_ROLE_ID = await getRoleID('customer', pool);
            const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);

            const sql_res = await pool.query(
                'INSERT INTO users(email, name, surname, password, id_role, slug) VALUES ($1, $2, $3, $4, $5, $6) RETURNING "ID", email, name, surname, id_role',
                [email, name, surname, password_hash, role === 'customer' ? CUSTOMER_ROLE_ID : ARTISAN_ROLE_ID, slug]
            );

            const user_info = sql_res.rows[0];
            user_info.roleName = role;

            sendUserData(res, user_info, 200);
        } catch (err) {
            if (err.detail.startsWith('Key (email)')) //unique violation on email
                sendError(res, 512);
            else if (err.detail.startsWith('Key (slug)')) { //unique violation on slug
                slug_error = true;
                slug = generateUserSlug(name, surname, pool);
            } else {
                console.error('Error creating user:', err);
                sendError(res, 500);
            }
        }
    } while (slug_error);
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return sendError(res, 400); // Bad request se mancano campi
    }

    try {
        const sql_res = await pool.query(
            `SELECT users."ID", users.email, users.name, users.surname, users.id_role, roles.name AS roleName, password FROM users 
            INNER JOIN roles ON users.id_role = roles."ID"
            WHERE email = $1`,
            [email]
        );

        if (sql_res.rowCount < 1) {
            sendError(res, 513);
            return;
        }

        const user_info = sql_res.rows[0];

        if (comparePassword(password, user_info.password))
            sendUserData(res, user_info);
        else sendError(res, 514);
    } catch (err) {
        console.error('Error during login:', err);
        sendError(res, 500);
    }
});

app.post('/logout', async (req, res) => {
    // Cancellazione token jwt dai cookie httpOnly
    res.clearCookie('jwt', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/' // Assicurati che il path corrisponda a quello usato in res.cookie
    });
    res.sendStatus(200);
});

// Rotta per ottenere i dati dell'utente autenticato (usa req.user.user_id)
app.get('/user', authJWT, async (req, res) => {
    const user_id = req.user.user_id; // user_id è fornito dal middleware authJWT

    try {
        const sql_res = await pool.query(
            'SELECT users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE users."ID" = $1',
            [user_id]
        );

        if (sql_res.rowCount < 1) {
            sendError(res, 515);
            return;
        }

        const user_data = sql_res.rows[0];

        const propic_url = user_data.id_profile_picture ? 'https://localhost:3000/images/' + user_data.id_profile_picture : null;

        const response = {
            name: user_data.user_name,
            surname: user_data.surname,
            role: user_data.role_name,
            bio: user_data.bio,
            url_profile_picture: propic_url,
        }

        if(user_data.role_name === 'artisan') {
            const r = await getArtisanReviews(id_artisan, pool);
            response.reviews_total = r.reviews_total;
            response.reviews_avg = r.reviews_avg;
        }

        res.status(200).json(response);
    } catch (err) {
        console.error('Error getting user data:', err);
        sendError(res, 500);
    }
});

//per ottenere gli artisans
app.get('/artisans/:page', async (req, res) => {
    try {
        const page = req.params.page;

        //verifica della correttezza della richiesta
        if(!isBodyInt(page, true)) {
            sendError(res, 404);
            return;
        }

        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);

        const query = 'SELECT "ID", name, surname, id_profile_picture, slug FROM users WHERE id_role = $1';
        const pages_res = await pool.query(query, [ARTISAN_ROLE_ID]);
        const num_artisans = pages_res.rowCount;
        const pages = Math.ceil(num_artisans / PER_PAGE);

        let sql_res = await pool.query(query + ` LIMIT ${PER_PAGE} OFFSET $2`, [ARTISAN_ROLE_ID, (pages - 1) * PER_PAGE]);

        const artisans = [];
        for(const row of sql_res.rows) {
            const artisan_reviews = await getArtisanReviews(row.ID, pool);
            artisans.push({
                name: row.name,
                surname: row.surname,
                photoProfile: row.id_profile_picture ? 'https://localhost:3000/images/' + row.id_profile_picture : null,
                link: `/artigiani/${row.slug}`,
                reviews_total: artisan_reviews.reviews_total,
                reviews_avg: artisan_reviews.reviews_avg
            });
        }

        res.json({artisans, pages, num_artisans});
    } catch (err) {
        console.error('Error getting artisans:', err);
        sendError(res, 500);
    }
});

app.get('/user/:user_slug', async (req, res) => {
    const user_slug_param = req.params.user_slug; // slug dall'URL

    try {
        const sql_res = await pool.query(
            'SELECT users."ID", users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE slug = $1',
            [user_slug_param]
        );

        if (sql_res.rowCount < 1) {
            sendError(res, 515);
            return;
        }

        const user_data = sql_res.rows[0];
        const propic_url = user_data.id_profile_picture ? 'https://localhost:3000/images/' + user_data.id_profile_picture : null;

        const response = {
            name: user_data.user_name,
            surname: user_data.surname,
            role: user_data.role_name,
            bio: user_data.bio,
            url_profile_picture: propic_url,
        }

        if(user_data.role_name === 'artisan') {
            const r = await getArtisanReviews(user_data.ID, pool);
            response.reviews_total = r.reviews_total;
            response.reviews_avg = r.reviews_avg;
        }

        res.status(200).json(response);
    } catch (err) {
        console.error('Error getting user data by user slug:', err);
        sendError(res, 500);
    }
});

if(process.env.NODE_ENV !== 'test') {
//configurazione autenticazione con google
configurePassport(passport);
/**
 * API utilizzata per il login con google
 */
app.get("/user/:googleId",async(req, res)=>{
    const googleId = req.params.googleId;

    const sql_res = await pool.query(
        'SELECT users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE users.google_id = $1',
        [googleId]
    );

    if (sql_res.rowCount < 1) {
        sendError(res, 515);
        return;
    }

    const user_data = sql_res.rows[0];

    const propic_url = user_data.id_profile_picture ? 'https://localhost:3000/images/' + user_data.id_profile_picture : null;

    res.status(200).json({
        name: user_data.user_name,
        surname: user_data.surname,
        role: user_data.role_name,
        bio: user_data.bio,
        url_profile_picture: propic_url,
    });
});
app.post("/user/:googleId",async(req, res)=>{
    const googleId = req.params.googleId;

    if (!req.body || !req.body.email || !req.body.name || !req.body.surname) {
        sendError(res, 400); // Bad request se mancano campi
        return;
    }

    const { email, name, surname} = req.body;
    
    let slug = '';
    try {
        slug = await generateUserSlug(name, surname, pool);
    } catch (e) {
        sendError(res, 518);
        return;
    }

    let slug_error = false;
    do {
        try {
            slug_error = false;

            const CUSTOMER_ROLE_ID = await getRoleID('customer', pool);
            const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);

            const sql_res = await pool.query(
                'INSERT INTO users(email, name, slug, google_id) VALUES ($1, $2, $3, $4) RETURNING "ID", email, name, surname',
                [email, name, surname, slug, googleId]
            );

            const user_info = sql_res.rows[0];

            sendUserData(res, user_info, 200);
        } catch (err) {
            if (err.detail.startsWith('Key (email)')) //unique violation on email
                sendError(res, 512);
            else if (err.detail.startsWith('Key (slug)')) { //unique violation on slug
                slug_error = true;
                slug = generateUserSlug(name, surname, pool);
            } else {
                console.error('Error creating user:', err);
                sendError(res, 500);
            }
        }
    } while (slug_error);

});
}

// Rotta per aggiornare i dati dell'utente autenticato
app.put('/user', authJWT, async (req, res) => {
    const user_id = req.user.user_id;
    const edits = req.body;

    if (typeof edits === 'undefined' || Object.keys(edits).length === 0) {
        sendError(res, 400); // Bad request se non ci sono edits
        return;
    }

    if(typeof(edits.password) !== 'undefined' && !checkPasswordFormat(edits.password)) {
        sendError(res, 516);
        return;
    }

    if(typeof(edits.email) !== 'undefined' && !checkEmailFormat(edits.email)) {
        sendError(res, 517);
        return;
    }



    const allowed_actions = ['email', 'name', 'surname', 'bio', 'id_profile_picture']; // Campi che l'utente può aggiornare

    const client = await pool.connect(); // Inizia una transazione con un client dal pool

    try {
        await client.query('BEGIN'); // Inizia la transazione

        const response = { password_changed: false };
        for (const act of allowed_actions) {
            if (typeof edits[act] !== 'undefined') {
                const sql_res = await client.query(
                    `UPDATE users SET ${act} = $1 WHERE "ID" = $2 RETURNING ${act}`,
                    [edits[act], user_id]
                );
                if (sql_res.rowCount > 0) {
                    response[act] = sql_res.rows[0][act];
                }
            }
        }


        if (typeof edits.password !== 'undefined') {
            const password_hash = generatePasswordHash(edits.password);
            await client.query(
                'UPDATE users SET password = $1 WHERE "ID" = $2',
                [password_hash, user_id]
            );
            response.password_changed = true;
            // TODO: consider blacklisting the JWT - per una gestione robusta della sicurezza
            // possibile implementazione: mantenere il timestamp dell'ultima modifica password
            // e non accettare i token generati prima di quel momento (guardando l'iat)
        }

        await client.query('COMMIT'); // Commette la transazione

        res.status(200).json(response);
    } catch (err) {
        if (err.code === '23505') // unique_violation (email duplicata)
            sendError(res, 512);
        else if (err.code === '23503' || err.code === '22P02') // foreign key violation (id immagine non presente) o id non valido
            sendError(res, 521);
        else {
            console.error('Error updating user:', err);
            sendError(res, 500);
        }
        await client.query('ROLLBACK'); // Fa il rollback in caso di errore
    } finally {
        client.release();
    }
});

//per vedere le review di un artigiano
app.get('/reviews/:artisan_slug/:page', async (req, res) => {
    try {
        const artisan_slug = req.params.artisan_slug; // slug dall'URL
        const page = req.params.page;

        //verifica della correttezza della richiesta
        if(!isBodyInt(page, true)) {
            sendError(res, 404);
            return;
        }

        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);

        let sql_res = await pool.query('SELECT "ID" FROM users WHERE id_role = $1 AND slug = $2', [ARTISAN_ROLE_ID, artisan_slug]);

        //non è stato trovato l'artigiano
        if(sql_res.rowCount <= 0) {
            sendError(res, 404);
            return;
        }

        const id_artisan = sql_res.rows[0].ID;

        const response = {page: parseInt(page), reviews: []};

        sql_res = await pool.query('SELECT ar.*, u.name, u.surname FROM artisan_reviews ar JOIN users u ON u."ID" = id_reviewer WHERE id_artisan = $1 LIMIT $2 OFFSET $3', [id_artisan, 20, (page - 1) * 20]);

        response.reviews_this_page = sql_res.rowCount;

        for(const row of sql_res.rows)
            response.reviews.push({
                reviewer: row.id_reviewer,
                rating: row.rating,
                review_text: row.review_text,
                timestamp: row.timestamp_review,
                reviewer_name: row.name,
                reviewer_surname: row.surname
            });

        res.json(response);
    } catch (err) {
        console.error('Error getting artisan reviews:', err);
        sendError(res, 500);
    }
});

//per aggiungere una review ad un artigiano
app.post('/reviewArtisan/:artisan_slug', authJWT, async (req, res) => {
    try {
        const artisan_slug = req.params.artisan_slug; // slug dall'URL

        const CUSTOMER_ROLE_ID = await getRoleID('customer', pool);

        //solo i customer possono aggiungere recensioni
        if(req.user.user_role_id !== CUSTOMER_ROLE_ID) {
            sendError(res, 403);
            return;
        }

        if(!req.body || !req.body.rating || !isBodyInt(req.body.rating, true)
        || !req.body.review_text || !isBodyString(req.body.review_text, false)
        || req.body.rating < 0 || req.body.rating > 5) {
            sendError(res, 400);
            return;
        }

        const { rating, review_text } = req.body;

        const ARTISAN_ROLE_ID = await getRoleID('artisan', pool);

        const sql_res = await pool.query('SELECT "ID" FROM users WHERE id_role = $1 AND slug = $2', [ARTISAN_ROLE_ID, artisan_slug]);

        //non è stato trovato l'artigiano
        if(sql_res.rowCount <= 0) {
            sendError(res, 404);
            return;
        }

        const id_artisan = sql_res.rows[0].ID;
        const id_reviewer = req.user.user_id;

        //cancella la vecchia recensione, se presente
        await pool.query('DELETE FROM artisan_reviews WHERE id_artisan = $1 AND id_reviewer = $2', [id_artisan, id_reviewer]);

        await pool.query(
            'INSERT INTO artisan_reviews(id_artisan, id_reviewer, rating, review_text) VALUES($1, $2, $3, $4)',
            [id_artisan, id_reviewer, rating, review_text]
        );

        res.json({ artisan: artisan_slug, rating, review_text });
    } catch (err) {
        console.error('Error giving artisan review:', err);
        sendError(res, 500);
    }
});

function generateOTP() {
    let otp = '';
    for(let i = 0; i < 6; i++)
        otp += Math.floor(Math.random() * 10);

    return otp;
}

//per richiedere un OTP
app.post('/requestOTP', async (req, res) => {
    try {
        if(!req.body || !req.body.email || !isBodyString(req.body.email, true)) {
            sendError(res, 400);
            return;
        }

        const { email } = req.body;

        const user_info = await pool.query('SELECT "ID", name FROM users WHERE email = $1', [email]);

        if(user_info.rowCount <= 0) {
            sendError(res, 515);
            return;
        }

        const otp = generateOTP();

        await pool.query('INSERT INTO email_otp(id_user, otp_code) VALUES($1, $2)', [user_info.rows[0].ID, otp]);

        await sendRecoveryEmail(email, user_info.name, otp);

        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Error sending otp:', err);
        sendError(res, 500);
    }
});

app.post('/resetPassword', async (req, res) => {
    try {
        if(!req.body || !req.body.otp || !isBodyString(req.body.otp, true)
        || !req.body.email || !isBodyString(req.body.email, true)
        || !req.body.password || !isBodyString(req.body.password, true)) {
            sendError(res, 400);
            return;
        }

        const { email, otp, password } = req.body;

        const user_info = await pool.query('SELECT "ID", name FROM users WHERE email = $1', [email]);

        if(user_info.rowCount <= 0) {
            sendError(res, 515);
            return;
        }

        const user_id = user_info.rows[0].ID;

        let sql_res = await pool.query('SELECT timestamp_creation FROM email_otp WHERE id_user = $1 AND otp_code = $2', [user_id, otp]);

        //non è stata trovata la coppia (id_user, otp_code), probabilmente l'otp è sbagliato
        if(sql_res.rowCount <= 0) {
            sendError(res, 403);
            return;
        }

        //otp scaduto
        if(new Date() - new Date(sql_res.rows[0].timestamp_creation) > 15 * 60 * 1000) {
            sendError(res, 526);
            return;
        }

        //password non corretta
        if (!checkPasswordFormat(password)) {
            sendError(res, 516);
            return;
        }

        //a questo punto sappiamo che l'utente ha inserito l'otp corretto
        const new_pass = generatePasswordHash(password);

        await pool.query('UPDATE users SET password = $1 WHERE "ID" = $2', [new_pass, user_id]);

        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Error sending otp:', err);
        sendError(res, 500);
    }
});

/**
 * API per ottenere il link della dashboard in base al ruolo dell'utente
 */
app.get("/dashboardPage", authJWT, (req, res) => {
    let role=req.user.user_role;
    let dashboardLink="";
    switch(role){
        case 'admin': dashboardLink="/admin/area-riservata"; break;
        case 'customer': dashboardLink="/clienti/area-riservata"; break;
        case 'artisan': dashboardLink="/artigiani/area-riservata"; break;
        default: dashboardLink="/clienti/area-riservata"; break;
    }
    res.status(200).json({dashboardLink: dashboardLink});
});

/**
 * API per verificare se l'utente è loggato (token JWT valido)
 */
app.get('/isLoggedIn', (req, res) => {
    // Verifica manuale della presenza del token JWT nel cookie
    const token = req.cookies && req.cookies.jwt;
    if (!token) {
        return res.status(200).json({ loggedIn: false });
    }else{
        return res.status(200).json({ loggedIn: true });
    }
});

app.get("/userSlug", authJWT, async(req, res)=>{
    const user_id = req.user.user_id;
    try {
        const sql_res = await pool.query(
            'SELECT slug FROM users WHERE "ID" = $1',
            [user_id]
        );
        if (sql_res.rowCount < 1) {
            sendError(res, 515); // Utente non trovato
            return;
        }
        res.status(200).json({ slug: sql_res.rows[0].slug });
    } catch (err) {
        console.error('Error getting user slug:', err);
        sendError(res, 500);
    }

});
/**
 * API per ottenere il link della dashboard in base al ruolo dell'utente
 */
app.get("/dashboardPage", authJWT, (req, res) => {
    let role=req.user.user_role;
    let dashboardLink="";
    switch(role){
        case 'admin': dashboardLink="/admin/area-riservata"; break;
        case 'customer': dashboardLink="/clienti/area-riservata"; break;
        case 'artisan': dashboardLink="/artigiani/area-riservata"; break;
        default: dashboardLink="/clienti/area-riservata"; break;
    }
    res.status(200).json({dashboardLink: dashboardLink});
});

/**
 * API per verificare se l'utente è loggato (token JWT valido)
 */
app.get('/isLoggedIn', (req, res) => {
    // Verifica manuale della presenza del token JWT nel cookie
    const token = req.cookies && req.cookies.jwt;
    if (!token) {
        return res.status(200).send(JSON.stringify({ loggedIn: false }));
    }
    res.status(200).send(JSON.stringify({ loggedIn: true }));
});

https.createServer(credentials, app).listen(port, () => {
  console.log("Microservice users online");
});

if(process.env.NODE_ENV !== 'test') {
app.get("/auth/google/callback", async(req, res)=>{
    passport.authenticate("google", {failureRedirect:'/login'}),(req, res)=>{
        const payload={
            user:{
                id:req.user.id,
                role_id:req.user.role_id,
                role:req.user.role
            }
        }
        jwt.sign(
            { user_id: payload.user.id, user_role_id: payload.user.role_id, user_role:payload.user.role },
            JWT_SECRET,
            { expiresIn: '1d' },
            async(err, token)=>{
            if(err) throw err;
            //init cookie
            res.cookie('jwt', token, {
                httpOnly: true,
                sameSite: 'None',
                secure: true,
                maxAge: 24 * 60 * 60 * 1000
            });
                // Ottieni il link della dashboard dall'API /dashboardPage
                try {
                    const fetch = (await import('node-fetch')).default;
                    const dashboardRes = await fetch('https://localhost:4000/dashboardPage', {
                        method: 'GET',
                        credentials: 'include'
                    });
                    const data = await dashboardRes.json();
                    res.redirect(data.dashboardLink);
                } catch (e) {
                    res.redirect('/');
                }
            }
        );
        
    }});

app.get("/auth/google", (req, res)=>{
    passport.authenticate("google",{scope:['profile','email']});
});

}