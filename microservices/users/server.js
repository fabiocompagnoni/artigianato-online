import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import cookieParser from 'cookie-parser';

import https from 'https';
import fs from 'fs';
import jwt from 'jsonwebtoken';

import sendError from './common_scripts/sendError.js';
import { generatePasswordHash, comparePassword, checkPasswordFormat, checkEmailFormat, generateUserSlug } from './scripts/util.js';
import authJWT from './common_scripts/authJWT.js';
import { getRoleID } from './common_scripts/utils.js';
import { sendUserData } from './scripts/userScripts.js';

import passport from 'passport';
import configurePassport from "./passportSetup.js";
import session from "express-session";

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

console.log(process.env.GOOGLE_CLIENT_ID ?? "Client ID non letto");
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie:true
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
        sameSite: 'None'
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

        res.status(200).json({
            name: user_data.user_name,
            surname: user_data.surname,
            role: user_data.role_name,
            bio: user_data.bio,
            url_profile_picture: propic_url,
        });
    } catch (err) {
        console.error('Error getting user data:', err);
        sendError(res, 500);
    }
});
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

app.get('/user/:user_slug', async (req, res) => {
    const user_slug_param = req.params.user_slug; // slug dall'URL

    try {
        const sql_res = await pool.query(
            'SELECT users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE slug = $1',
            [user_slug_param]
        );

        if (sql_res.rowCount < 1) {
            sendError(res, 515);
            return;
        }

        const user_data = sql_res.rows[0];
        const propic_url = user_data.id_profile_picture ? 'https://localhost:3000/images/' + user_data.id_profile_picture : null;

        res.status(200).send({
                name: user_data.user_name,
                surname: user_data.surname,
                role: user_data.role_name,
                bio: user_data.bio,
                url_profile_picture: propic_url,
            });
    } catch (err) {
        console.error('Error getting user data by user slug:', err);
        sendError(res, 500);
    }
});

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

