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

export function getTrimmedName(name) {
    let trim = '';
    for (const c of name) {
        const code = c.charCodeAt(0);
        if ((code >= 97 && code <= 122) || (code >= 65 && code <= 90))
            trim += c.toLowerCase();
    }

    return trim;
}