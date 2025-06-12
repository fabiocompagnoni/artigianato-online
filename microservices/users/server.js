import express from 'express';
import cors from "cors";
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser'; // Questa riga è correttamente importata

// Per gestire le variabili d'ambiente in fase di sviluppo, puoi scommentare dotenv
// e creare un file .env nella root del progetto con le tue variabili
// import dotenv from 'dotenv';
// dotenv.config();

const app = express();
const port = 4000;

// Assicurati che queste variabili d'ambiente siano definite nel tuo ambiente Docker
// o nel tuo file .env se usi dotenv
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key'; // Fallback per sviluppo
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@host:port/database'; // Fallback per sviluppo

const pool = new Pool({ connectionString: DATABASE_URL });

// Configurazione CORS più robusta per lo sviluppo del microservizio
const allowedOrigins = [
  'http://localhost:3000', // L'indirizzo del tuo backend proxy
  'http://localhost:3001', // Esempio: il tuo frontend React o Vue su porta 3001
  'http://localhost:5173', // Esempio: il tuo frontend Vite su porta 5173
  'http://localhost:4200', // Esempio: il tuo frontend Angular su porta 4200
  'http://localhost',
  'https://localhost',
  'http://127.0.0.1',
  'http://127.0.0.1:3000', // L'indirizzo del tuo backend proxy
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4200',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true // Necessario per l'invio di cookie (es. httpOnly)
}));

//app.options('*', cors()); // Gestione delle richieste OPTIONS preflight

app.use(express.json());
app.use(cookieParser()); // Usa il middleware cookie-parser

// Health check endpoint (prima definizione)
app.get('/', (req, res) => {
  res.send(JSON.stringify({ service: 'users', status: 'ok' }));
});

// Funzioni di utilità
async function getRoleID(role_name) {
  try {
    const res = await pool.query('SELECT "ID" FROM roles WHERE name = $1', [role_name]);
    if (res.rowCount < 1)
      return -1;
    return res.rows[0].ID;
  } catch (err) {
    console.error('Error in getRoleID:', err);
    return -1;
  }
}

function generateUserJWT(user_info) {
  // Assicurati che JWT_SECRET non sia undefined in produzione
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined!');
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ user_id: user_info.ID, user_role_id: user_info.id_role }, JWT_SECRET, { expiresIn: '1d' });
}

const error_messages = {
  500: 'Internal server error',
  512: 'Email already registered',
  513: 'Email address not found',
  514: 'Wrong password',
  515: 'User id not found',
  401: 'Unauthorized',
  403: 'Forbidden',
};

function sendError(res, status) {
  res.status(status);
  res.send(JSON.stringify({ error: error_messages[status] || 'Internal server error' }));
}

async function getUserPropicUrl(image_id) {
  if (!image_id) return null; // Gestisci il caso di image_id nullo/undefined
  try {
    const sql_res = await pool.query('SELECT url FROM images WHERE "ID" = $1', [image_id]);
    if (sql_res.rowCount < 1)
      return null;
    return sql_res.rows[0].url;
  } catch (err) {
    console.error('Error in getUserPropicUrl:', err);
    return null;
  }
}

// Middleware di autenticazione JWT
function authJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (typeof (token) === 'undefined' || !token) { // Controlla anche che il token non sia stringa vuota
      sendError(res, 401);
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error('JWT verification error:', err); // Logga l'errore di verifica
        sendError(res, 403);
        return;
      }
      req.user = user;
      next();
    });
  } catch (err) {
    console.error('AuthJWT catch error:', err);
    sendError(res, 500);
  }
}

function generatePasswordHash(password) {
  return bcrypt.hashSync(password, 12);
}


// Routes
app.post('/user', async (req, res) => {
  const { email, name, surname, password } = req.body;

  if (!email || !name || !surname || !password) {
    return sendError(res, 400); // Bad request se mancano campi
  }

  const password_hash = generatePasswordHash(password);
  const id_customer = await getRoleID('customer');

  if (id_customer === -1) {
    console.error("No id for role 'customer' was found. Check your roles table.");
    sendError(res, 500);
    return;
  }

  try {
    const sql_res = await pool.query('INSERT INTO users(email, name, surname, password, id_role) VALUES ($1, $2, $3, $4, $5) RETURNING "ID", email, name, surname, id_role', [email, name, surname, password_hash, id_customer]);

    const user_info = sql_res.rows[0];

    res.status(201).send(JSON.stringify({ // 201 Created per successo
      email: user_info.email,
      name: user_info.name,
      surname: user_info.surname,
      jwt: generateUserJWT(user_info)
    }));
  } catch (err) {
    if (err.code === '23505') // unique_violation (es. email duplicata)
      sendError(res, 512);
    else {
      console.error('Error creating user:', err);
      sendError(res, 500);
    }
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400); // Bad request se mancano campi
  }

  try {
    const sql_res = await pool.query('SELECT "ID", email, name, surname, id_role, password FROM users WHERE email = $1', [email]);

    if (sql_res.rowCount < 1) {
      sendError(res, 513);
      return;
    }

    const user_info = sql_res.rows[0];

    if (bcrypt.compareSync(password, user_info.password)) {
      let jwtToken = generateUserJWT(user_info);

      // Memorizzazione token JWT in Cookie httpOnly
      res.cookie('jwt', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Solo in produzione per HTTPS
        sameSite: 'Lax', 
        maxAge: 1000 * 60 * 60 * 24 // 1 giorno (corrisponde a '1d' del JWT)
      });
      res.status(200).send(JSON.stringify({
        email: user_info.email,
        name: user_info.name,
        surname: user_info.surname,
        jwt: jwtToken
      }));
    } else {
      sendError(res, 514);
    }
  } catch (err) {
    console.error('Error during login:', err);
    sendError(res, 500);
  }
});

app.get("/logout", async (req, res) => {
  // Cancellazione token jwt dai cookie httpOnly
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Solo in produzione per HTTPS
    sameSite: 'Lax'
  });
  res.sendStatus(200);
});

// Rotta per ottenere i dati dell'utente autenticato (usa req.user.user_id)
app.get('/user', authJWT, async (req, res) => {
  const user_id = req.user.user_id; // user_id è fornito dal middleware authJWT

  try {
    const sql_res = await pool.query('SELECT users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE users."ID" = $1', [user_id]);

    if (sql_res.rowCount < 1) {
      sendError(res, 515);
      return;
    }

    const user_data = sql_res.rows[0];

    const propic_url = await getUserPropicUrl(user_data.id_profile_picture);

    res.status(200).send(JSON.stringify({
      name: user_data.user_name,
      surname: user_data.surname,
      role: user_data.role_name,
      bio: user_data.bio,
      url_profile_picture: propic_url
    }));
  } catch (err) {
    console.error('Error getting user data:', err);
    sendError(res, 500);
  }
});

app.get('/user/:user_id', authJWT, async (req, res) => {
  const user_id_param = req.params.user_id; // ID dall'URL
  const auth_user_id = req.user.user_id; // ID dall'autenticazione JWT



  try {
    const sql_res = await pool.query('SELECT users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE users."ID" = $1', [user_id_param]);

    if (sql_res.rowCount < 1) {
      sendError(res, 515);
      return;
    }

    const user_data = sql_res.rows[0];
    const propic_url = await getUserPropicUrl(user_data.id_profile_picture);

    res.status(200).send(JSON.stringify({
      name: user_data.user_name,
      surname: user_data.surname,
      role: user_data.role_name,
      bio: user_data.bio,
      url_profile_picture: propic_url
    }));
  } catch (err) {
    console.error('Error getting user data by ID:', err);
    sendError(res, 500);
  }
});


// Rotta per aggiornare i dati dell'utente autenticato
app.put('/user', authJWT, async (req, res) => {
  const user_id = req.user.user_id;
  const edits = req.body;

  if (typeof (edits) === 'undefined' || Object.keys(edits).length === 0) {
    return sendError(res, 400); // Bad request se non ci sono edits
  }

  const allowed_actions = ['email', 'name', 'surname', 'bio']; // Campi che l'utente può aggiornare

  const client = await pool.connect(); // Inizia una transazione con un client dal pool

  try {
    await client.query('BEGIN'); // Inizia la transazione

    const response = { password_changed: false };
    for (const act of allowed_actions) {
      if (typeof (edits[act]) !== 'undefined') {
        const sql_res = await client.query(`UPDATE users SET ${act} = $1 WHERE "ID" = $2 RETURNING ${act}`, [edits[act], user_id]);
        if (sql_res.rowCount > 0) {
          response[act] = sql_res.rows[0][act];
        }
      }
    }

    if (typeof (edits.password) !== 'undefined') {
      const password_hash = generatePasswordHash(edits.password);
      await client.query('UPDATE users SET password = $1 WHERE "ID" = $2', [password_hash, user_id]);
      response.password_changed = true;
      // TODO: consider blacklisting the JWT - per una gestione robusta della sicurezza
    }

    await client.query('COMMIT'); // Commette la transazione

    res.status(200).send(JSON.stringify(response));
  } catch (err) {
    await client.query('ROLLBACK'); // Fa il rollback in caso di errore
    if (err.code === '23505') // unique_violation (es. email duplicata)
      sendError(res, 512);
    else {
      console.error('Error updating user:', err);
      sendError(res, 500);
    }
  } finally {
    client.release();
  }
});


app.listen(port, () => {
  console.log(`Users microservice online on port ${port}`);
  console.log('CORS configured for:', allowedOrigins.join(', '));
});

/*import express from 'express';
import cors from "cors";
import jwt from 'jsonwebtoken';
import {Pool} from 'pg';
//import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
//dotenv.config();

const app = express();
const port = 4000;

const JWT_SECRET = process.env.JWT_SECRET;

const pool = new Pool({connectionString: process.env.DATABASE_URL});

const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost',
  'https://localhost',
  'http://127.0.0.1',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true
}));
app.options('*', cors());
app.use(express.json());
app.use(cookieParser());

//functions and datas
async function getRoleID(role_name) {
    const res = await pool.query('SELECT "ID" FROM roles WHERE name = $1', [role_name]);
    if(res.rowCount < 1)
        return -1;
    return res.rows[0].ID;
}

function generateUserJWT(user_info) {
    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined!');
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({ user_id: user_info.ID, user_role_id: user_info.id_role }, JWT_SECRET, { expiresIn: '1d' });
}

const error_messages = {
    500: 'Internal server error',
    512: 'Email already registered',
    513: 'Email address not found',
    514: 'Wrong password',
    515: 'User id not found',
    401: 'Unauthorized',
    403: 'Forbidden',
};

function sendError(res, status) {
    res.status(status);
    res.send(JSON.stringify({error: error_messages[status] || 'Internal server error'}));
}

async function getUserPropicUrl(image_id) {
    if (!image_id) return null;
    try{
        const sql_res = await pool.query('SELECT url FROM images WHERE "ID" = $1', [image_id]);
    
        if(sql_res.rowCount < 1)
            return null;

        return sql_res.rows[0].url;
    }catch(err){
        console.error("Error in getUserPropicUrl: ",err);
        return null;
    }
}

//jwt auth middleware
function authJWT(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if(typeof(token) === 'undefined' || !token){
            sendError(res, 401);
            return;
        }

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if(err) {
                sendError(res, 403);
                return;
            }

            req.user = user;
            next();
        });
    } catch(err) {
        console.log(err);
        sendError(res, 500);
    }
}

function generatePasswordHash(password) {
    return bcrypt.hashSync(password, 12);
}


//routes
app.post('/user', async (req, res) => {
    const {email, name, surname, password} = req.body;

    const password_hash = generatePasswordHash(password);
    const id_customer = await getRoleID('customer');

    if(id_customer === -1) {
        console.log("No id for role 'customer' was found");
        sendError(res, 500);
        return;
    }

    try {
        const sql_res = await pool.query('INSERT INTO users(email, name, surname, password, id_role) VALUES ($1, $2, $3, $4, $5) RETURNING "ID", email, name, surname', [email, name, surname, password_hash, id_customer]);

        const user_info = sql_res.rows[0];

        res.send(JSON.stringify({
            email: user_info.email,
            name: user_info.name,
            surname: user_info.surname,
            jwt: generateUserJWT(user_info)
        }));
    } catch(err) {
        if(err.code === '23505') //unique_violation https://www.postgresql.org/docs/current/errcodes-appendix.html
            sendError(res, 512);
        else {
            console.log(err);
            sendError(res, 500);
        }
    }
});

app.post('/login', async (req, res) => {
    const {email, password} = req.body;

    const sql_res = await pool.query('SELECT "ID", email, name, surname, id_role, password FROM users WHERE email = $1', [email]);

    if(sql_res.rowCount < 1) {
        sendError(res, 513);
        return;
    }

    const user_info = sql_res.rows[0];

    if(bcrypt.compareSync(password, user_info.password)){
        let jwtToken=generateUserJWT(user_info);
        //memorizzazione token JWT in Cookie httpOnly
        res.cookie('jwt', jwtToken, {
            httpOnly: true,
            secure: true,   
            sameSite: 'lax',
            maxAge:  1000 * 60 * 60 * 24 // 1 giorno
        });
        res.send(JSON.stringify({
            email: user_info.email,
            name: user_info.name,
            surname: user_info.surname,
            jwt: jwtToken
        }));
    }
        
    else
        sendError(res, 514);
});

app.get("/logout", async(req, res)=>{
    //cancellazione token jwt dai cookie httpOnly
    res.clearCookie('jwt',{
        httpOnly:true,
        secure:true,
        sameSite:'lax'
    });
    res.sendStatus(200);
});

app.get('/user/:user_id', authJWT, async (req, res) => {
    const user_id = req.params.user_id;

    const sql_res = await pool.query('SELECT users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE users."ID" = $1', [user_id]);

    if(sql_res.rowCount < 1) {
        sendError(res, 515);
        return;
    }

    const user_data = sql_res.rows[0];

    const propic_url = await getUserPropicUrl(user_data.id_profile_picture);

    res.send(JSON.stringify({
        name: user_data.user_name,
        surname: user_data.surname,
        role: user_data.role_name,
        bio: user_data.bio,
        url_profile_picture: propic_url
    }));
});

app.put('/user', authJWT, async (req, res) => {
    const user_id = req.user.user_id;
    const edits = req.body;

    if(typeof(edits) === 'undefined') {
        sendError(res, 401);
        return;
    }

    //TODO: implement system to update profile picture
    const actions = ['email', 'name', 'surname', 'bio'];

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const response = {password_changed: false};
        for(const act of actions)
            if(typeof(edits[act]) !== 'undefined') {
                const sql_res = await client.query(`UPDATE users SET ${act} = $1 WHERE "ID" = $2 RETURNING ${act}`, [edits[act], user_id]);
                response[act] = sql_res.rows[0][act];
            }
        
        if(typeof(edits.password) !== 'undefined') {
            const password_hash = generatePasswordHash(edits.password);
            await client.query('UPDATE users SET password = $1 WHERE "ID" = $2', [password_hash, user_id]);
            response.password_changed = true;
            //TODO: consider blacklisting the JWT
        }

        await client.query('COMMIT');

        res.send(JSON.stringify(response));
    } catch(err) {
        if(err.code === '23505') //unique_violation https://www.postgresql.org/docs/current/errcodes-appendix.html
            sendError(res, 512);
        else {
            console.log(err);
            sendError(res, 500);
        }
    } finally {
        await client.query('ROLLBACK');
        client.release();
    }
});

app.get('/', (req, res) => {
    res.send(JSON.stringify({service: 'users', status: 'ok'}));
});

app.listen(port, () => {
    console.log('Users microservice online');
});
*/