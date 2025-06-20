import bcrypt from 'bcryptjs';
import { getTrimmedName } from '../common_scripts/utils.js';

export function generatePasswordHash(password) {
    return bcrypt.hashSync(password, 12);
}

export function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

/*
Requirements:
-length between 8 and 32 characters
-one uppercase letter
-one lowercase
-one digit
-one special character
*/
export function checkPasswordFormat(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\s\S]{8,32}$/;
    return regex.test(password);
}

export function checkEmailFormat(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

//not immune to race conditions, DBMS will handle that
export async function generateUserSlug(name, surname, pool) {
    const first = getTrimmedName(name);
    const second = getTrimmedName(surname);

    if (first === '' || second === '')
        throw new Error('Unable to generate slug from user name and surname');

    const slug = first + '-' + second;
    let res = await pool.query('SELECT 1 FROM users WHERE slug = $1', [slug]);

    //no users with this slug were found
    if (res.rowCount < 1) return slug;

    res = await pool.query('SELECT COUNT(*) AS num FROM users WHERE slug LIKE $1', [slug + '-%']);
    const num = parseInt(res.rows[0].num) + 1;

    return slug + '-' + num;
}