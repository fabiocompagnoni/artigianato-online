import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import https from 'https';

import sendError from './common_scripts/sendError.js';
import { getRoleID, generatePasswordHash, comparePassword, checkPasswordFormat, checkEmailFormat, generateUserSlug } from './scripts/util.js';
import authJWT from './common_scripts/authJWT.js';
import { sendUserData } from './scripts/userScripts.js';

const privateKey = fs.readFileSync('/certs/server.key', 'utf8');
const certificate = fs.readFileSync('/certs/server.crt', 'utf8');
const credentials = {
  key: privateKey,
  cert: certificate
};

const app = express();
const port = 4000;

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({ connectionString: DATABASE_URL });

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

//app.options('*', cors()); // Gestione delle richieste OPTIONS preflight

app.use(express.json());
app.use(cookieParser());

// Health check endpoint (prima definizione)
app.get('/', (req, res) => {
    res.send(JSON.stringify({ service: 'users', status: 'ok' }));
});


// Routes
app.post('/user', async (req, res) => {
    if(!req.body) {
        sendError(res, 400);
        return;
    }

    const { email, name, surname, password } = req.body;

    if (!req.body.email || !req.body.name || !req.body.surname || !req.body.password) {
        sendError(res, 400); // Bad request se mancano campi
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
    const id_customer = await getRoleID('customer', pool);

    if (id_customer === -1) {
        console.error(
            "No id for role 'customer' was found. Check your roles table."
        );
        sendError(res, 500);
        return;
    }

    let slug_error = false;
    do {
        try {
            slug_error = false;
            const sql_res = await pool.query(
                'INSERT INTO users(email, name, surname, password, id_role, slug) VALUES ($1, $2, $3, $4, $5, $6) RETURNING "ID", email, name, surname, id_role',
                [email, name, surname, password_hash, id_customer, slug]
            );

            const user_info = sql_res.rows[0];

            sendUserData(res, user_info, 201);
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
            'SELECT "ID", email, name, surname, id_role, password FROM users WHERE email = $1',
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

        const propic_url = user_data.id_profile_picture ? user_data.id_profile_picture : null;

        res.status(200).send(
            JSON.stringify({
                name: user_data.user_name,
                surname: user_data.surname,
                role: user_data.role_name,
                bio: user_data.bio,
                url_profile_picture: propic_url,
            })
        );
    } catch (err) {
        console.error('Error getting user data:', err);
        sendError(res, 500);
    }
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
        const propic_url = user_data.id_profile_picture ? user_data.id_profile_picture : null;

        res.status(200).send(
            JSON.stringify({
                name: user_data.user_name,
                surname: user_data.surname,
                role: user_data.role_name,
                bio: user_data.bio,
                url_profile_picture: propic_url,
            })
        );
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

        res.status(200).send(JSON.stringify(response));
    } catch (err) {
        if (err.code === '23505')
            // unique_violation (email duplicata)
            sendError(res, 512);
        else {
            console.error('Error updating user:', err);
            sendError(res, 500);
        }
        await client.query('ROLLBACK'); // Fa il rollback in caso di errore
    } finally {
        client.release();
    }
});

/*
app.listen(port, () => {
    console.log('Users microservice online');
});
*/
https.createServer(credentials, app).listen(port, () => {
  console.log("Microservice users listening on port "+port);
});