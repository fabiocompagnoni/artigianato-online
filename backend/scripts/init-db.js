import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({connectionString: process.env.DATABASE_URL});

async function waitDBOnline(retries) {
    for(let i = 0; i < retries; i++) {
        try {
            await pool.query('SELECT 1');
            return true;
        } catch(err) {
            console.log(`Waiting for database to be online, attempt ${i + 1}/${retries}`);
            await new Promise(res => setTimeout(res, 2000));
        }
    }
    return false;
}

async function isDBInitialized() {
    try {
        await pool.query('SELECT 1 FROM users LIMIT 1');
        return true;
    } catch(err) {
        return false;
    }
}

async function initiateDB() {
    try {
        if(await waitDBOnline(10)) {
            if(await isDBInitialized())
                console.log('Database already initialized');
            else {
                try {
                    const sql_file_path = path.join(__dirname, 'init.sql');
                    const sql_code = fs.readFileSync(sql_file_path, 'utf-8');

                    await pool.query(sql_code);
                    console.log('Database initialized successfully');
                } catch(err) {
                    console.error('Error in the initialization of the database, details: ' + err);
                    process.exit(1);
                }
            }
        } else {
            console.error('Couldn\'t enstablish connection with the database');
            process.exit(1);
        }
    } catch(err) {
        console.error('Unknown error happened: ' + err);
    } finally {
        await pool.end();
    }
}

initiateDB();