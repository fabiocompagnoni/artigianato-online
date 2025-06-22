export function selectLowestStatus(statuses) {
    if(!Array.isArray(statuses) || statuses.length < 1)
        return null;
    const names = ['Rimborsato', 'Annullato', 'Pagato', 'Spedito'];
    for(const status of names)
        if(statuses.indexOf(status) !== -1)
            return status;
    return 'Consegnato';
}