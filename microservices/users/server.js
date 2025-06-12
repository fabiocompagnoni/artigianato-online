import express from 'express';
import cors from "cors";
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';

const app = express();
const port = 4000;

const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

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
app.use(cookieParser());

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
    515: 'User not found',
    516: 'Invalid password format',
    517: 'Invalid email format',
    518: 'Invalid user name or surname',
    401: 'Unauthorized',
    403: 'Forbidden',
};

function sendError(res, status) {
  res.status(status);
  res.send(JSON.stringify({ error: error_messages[status] || 'Internal server error' }));
}

function sendUserData(res, user_info, response_code = 200) {
    res.cookie('jwt', generateUserJWT(user_info), {
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production', // Solo in produzione per HTTPS
        maxAge: 24 * 60 * 60 * 1000
    });
    res.status(response_code).send(JSON.stringify({
        email: user_info.email,
        name: user_info.name,
        surname: user_info.surname
    }));
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
    const token = req.cookies.jwt;

    if (typeof (token) === 'undefined' || !token) { // Controlla anche che il token non sia stringa vuota, null o undefined
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

/*
Requirements:
-length between 8 and 32 characters
-one uppercase letter
-one lowercase
-one digit
-one special character
*/
function checkPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\s\S]{8,32}$/;
    return regex.test(password);
}

function checkEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function getTrimmedName(name) {
    let trim = '';
    for(const c of name) {
        const code = c.charCodeAt(0);
        if(code >= 97 && code <= 122 || code >= 65 && code <= 90)
            trim += c.toLowerCase();
    }

    return trim;
}

//not immune to race conditions, DBMS will handle that
async function generateUserSlug(name, surname) {
    const first = getTrimmedName(name);
    const second = getTrimmedName(surname);

    if(first === '' || second === '')
        throw new Error('Unable to generate slug from user name and surname');

    const slug = first + '-' + second;
    let res = await pool.query('SELECT slug FROM users WHERE slug = $1', [slug]);

    //no users with this slug were found
    if(res.rowCount < 1)
        return slug;

    res = await pool.query('SELECT COUNT(*) AS num FROM users WHERE slug LIKE $1', [slug + '-%']);
    const num = parseInt(res.rows[0].num) + 1;

    return slug + '-' + num;
}

// Routes
app.post('/user', async (req, res) => {
  const { email, name, surname, password } = req.body;

  if (!email || !name || !surname || !password) {
    sendError(res, 400); // Bad request se mancano campi
    return;
  }

  let slug = '';
    try {
        slug = await generateUserSlug(name, surname);
    } catch(e) {
        sendError(res, 518);
        return;
    }

    if(!checkPassword(password)) {
        sendError(res, 516);
        return;
    }

    if(!checkEmail(email)) {
        sendError(res, 517);
        return;
    }

  const password_hash = generatePasswordHash(password);
  const id_customer = await getRoleID('customer');

  if (id_customer === -1) {
    console.error("No id for role 'customer' was found. Check your roles table.");
    sendError(res, 500);
    return;
  }

  let slug_error = false;
  do {
        try {
            slug_error = true;
            const sql_res = await pool.query('INSERT INTO users(email, name, surname, password, id_role, slug) VALUES ($1, $2, $3, $4, $5, $6) RETURNING "ID", email, name, surname, id_role', [email, name, surname, password_hash, id_customer, slug]);

            const user_info = sql_res.rows[0];

            sendUserData(res, user_info, 201);
        } catch (err) {
            if(err.detail.startsWith('Key (email)')) //unique violation on email
                    sendError(res, 512);
                else if(err.detail.startsWith('Key (slug)')) { //unique violation on slug
                    slug_error = true;
                    slug = generateUserSlug(name, surname);
                }
            else {
            console.error('Error creating user:', err);
            sendError(res, 500);
            }
        }
    } while(slug_error);
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

    if (bcrypt.compareSync(password, user_info.password))
      sendUserData(res, user_data);
    else
      sendError(res, 514);
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

app.get('/user/:user_slug', async (req, res) => {
  const user_slug_param = req.params.user_slug; // slug dall'URL

  try {
    const sql_res = await pool.query('SELECT users.name AS user_name, surname, roles.name AS role_name, bio, id_profile_picture FROM users JOIN roles ON id_role = roles."ID" WHERE slug = $1', [user_slug_param]);

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
    console.error('Error getting user data by user slug:', err);
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
      // possibile implementazione: mantenere il timestamp dell'ultima modifica password
      // e non accettare i token generati prima di quel momento (guardando l'iat)
    }

    await client.query('COMMIT'); // Commette la transazione

    res.status(200).send(JSON.stringify(response));
  } catch (err) {
    if (err.code === '23505') // unique_violation (email duplicata)
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


app.listen(port, () => {
  console.log(`Users microservice online on port ${port}`);
  console.log('CORS configured for:', allowedOrigins.join(', '));
});