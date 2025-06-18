export function isBodyString(value, not_empty = false) {
    return typeof(value) === 'string' && (!not_empty || value.length > 0);
}

export function isPrice(value, not_negative = false) {
    value = parseFloat(value);
    return !isNaN(value) && (!not_negative || value >= 0);
}

export function isBodyInt(v, not_negative = false) {
    const value = parseInt(v);
    return !isNaN(value) && (!not_negative || value >= 0) && value == parseFloat(v);
}