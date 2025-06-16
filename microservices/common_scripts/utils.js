export function getTrimmedName(name) {
    let trim = '';
    for (const c of name) {
        const code = c.charCodeAt(0);
        if ((code >= 97 && code <= 122) || (code >= 65 && code <= 90))
            trim += c.toLowerCase();
    }

    return trim;
}