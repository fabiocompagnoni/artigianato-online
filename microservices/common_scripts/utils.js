export async function getRoleID(role_name, pool) {
    try {
        const res = await pool.query('SELECT "ID" FROM roles WHERE name = $1', [
            role_name,
        ]);
        if (res.rowCount < 1) return -1;
        return res.rows[0].ID;
    } catch (err) {
        console.error('Error in getRoleID:', err);
        return -1;
    }
}

export async function getOrderStatusID(status_name, pool) {
    try {
        const res = await pool.query('SELECT "ID" FROM order_status WHERE name = $1', [
            status_name,
        ]);
        if (res.rowCount < 1) return -1;
        return res.rows[0].ID;
    } catch (err) {
        console.error('Error in getOrderStatusID:', err);
        return -1;
    }
}

export async function getTicketStatusID(status_name, pool) {
    try {
        const res = await pool.query('SELECT "ID" FROM ticket_status WHERE name = $1', [
            status_name,
        ]);
        if (res.rowCount < 1) return -1;
        return res.rows[0].ID;
    } catch (err) {
        console.error('Error in getOrderStatusID:', err);
        return -1;
    }
}

export function getTrimmedName(name, remove_spaces = true) {
    let trim = '';
    for (const c of name) {
        const code = c.charCodeAt(0);
        if ((code >= 97 && code <= 122) || (code >= 65 && code <= 90))
            trim += c.toLowerCase();
        else if(!remove_spaces && c === ' ')
            trim += '-';
    }

    return trim;
}

export const getProductThumbnail=async(idProduct, pool)=>{
    let product_image = "https://localhost/src/img/placeholder.png";
    const product_image_res = await pool.query('SELECT "ID_image" FROM product_images WHERE "ID_product" = $1 AND position = 0', [idProduct]);
    if(product_image_res.rowCount > 0)
        product_image = 'https://localhost:3000/images/' + product_image_res.rows[0].ID_image;
    return product_image;  
}

export async function getArtisanReviews(id_artisan, pool) {
    const sql_res = await pool.query(
        'SELECT COUNT(*) AS total_reviews, SUM(rating) / COUNT(*) AS average from artisan_reviews WHERE id_artisan = $1 GROUP BY id_artisan',
        [id_artisan]
    );

    if(sql_res.rowCount <= 0)
        return {reviews_total: 0, reviews_avg: 0};
    return {reviews_total: parseInt(sql_res.rows[0].total_reviews), reviews_avg: parseInt(sql_res.rows[0].average)};
}