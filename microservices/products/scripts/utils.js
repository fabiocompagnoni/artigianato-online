import { getTrimmedName } from '../common_scripts/utils.js';

//generates the category if it doesn't exist in the database
//not immune to race conditions, DBMS will handle that
export async function getCategoryID(name, pool) {
    const slug = getTrimmedName(name, false);

    if (slug === '')
        throw new Error('Unable to get category ID');

    let res = await pool.query('SELECT "ID" FROM categories WHERE slug = $1', [slug]);

    //if the slug was not found, it will be created
    if (res.rowCount < 1)
        res = await pool.query('INSERT INTO categories(name, slug) VALUES($1, $2) RETURNING "ID"', [name, slug]);
    
    return res.rows[0].ID;
}

export async function generateArtisanProductSlug(artisan_id, product_name, pool) {
    const slug = getTrimmedName(product_name, false);

    if(slug === '')
        throw new Error('Unable to generate product slug');

    let res = await pool.query('SELECT 1 FROM products WHERE slug = $1 AND artisan = $2', [slug, artisan_id]);

    if(res.rowCount < 1) return slug;

    res = await pool.query('SELECT COUNT(*) AS num FROM products WHERE slug LIKE $1 AND artisan = $2', [slug + '-%', artisan_id]);
    const num = parseInt(res.rows[0].num) + 1;

    return slug + '-' + num;
}