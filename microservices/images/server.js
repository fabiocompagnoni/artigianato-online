import express from 'express';
import {Pool} from 'pg';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import sharp from 'sharp';
import cookieParser from 'cookie-parser';

import https from 'https';
import fs from 'fs';

import sendError from './common_scripts/sendError.js';
import authJWT from "./common_scripts/authJWT.js";

const PORT = 4000;
const DATABASE_URL = process.env.DATABASE_URL;
const IMAGES_FOLDER = path.join(process.cwd(), 'uploads');

const privateKey = fs.readFileSync('/certs/server.key', 'utf8');
const certificate = fs.readFileSync('/certs/server.crt', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate
};

const app = express();
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

app.use(cookieParser());


if(!fs.existsSync(IMAGES_FOLDER))
    fs.mkdirSync(IMAGES_FOLDER);

//i file vengono caricati in memoria, poi vengono processati e scaricati sul disco
const upload = multer({ storage: multer.memoryStorage() });

// Health check endpoint (prima definizione)
app.get('/', (req, res) => {
    res.json({ service: 'images', status: 'ok' });
});

app.post('/upload', authJWT, upload.single('image'), async (req, res) => {
    const file = req.file;
    if(!file)
        sendError(res, 519);

    //generazione euristica di un id, probabilità di collisione prossima allo 0
    const file_id = uuidv4();
    const file_name = file_id + '.jpg';
    const file_path = path.join(IMAGES_FOLDER, file_name);

    try {
        //compressione dell'immagine e scrittura sul disco
        await sharp(file.buffer).jpeg({ quality: 80 }).toFile(file_path);

        //per l'id generato non è necessario controllare che l'id non sia già presente prima di fare l'insert
        await pool.query('INSERT INTO images("ID") VALUES ($1)', [file_id]);

        res.json({ file_id });
    } catch(err) {
        console.log('Error during image processing: ' + err);
        sendError(res, 520);
    }
});

function validateID(id) {
    const uuidv4pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidv4pattern.test(id);
}

//un id valido non può essere 'upload' in quanto deve seguire il pattern di un uuid
app.get('/:id', (req, res) => {
    const { id } = req.params;

    if(!validateID(id)) {
        sendError(res, 404);
        return;
    }
    
    const file_path = path.join(IMAGES_FOLDER, id + '.jpg');

    if(fs.existsSync(file_path))
        res.sendFile(file_path);
    else
        sendError(res, 404);
});

https.createServer(credentials, app).listen(PORT, () => {
  console.log("Microservice images online");
});