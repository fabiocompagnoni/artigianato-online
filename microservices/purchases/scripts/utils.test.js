import { selectLowestStatus } from "./utils";

test('Selecting lowest status from empty array', () => {
    expect(selectLowestStatus([])).toBe(null);
});

test('Selecting lowest status from not array', () => {
    expect(selectLowestStatus('Rimborsato')).toBe(null);
});

test('Selecting lowest status from normal array 1', () => {
    expect(selectLowestStatus(['Rimborsato', 'Annullato'])).toBe('Rimborsato');
});

test('Selecting lowest status from normal array 2', () => {
    expect(selectLowestStatus(['Annullato', 'Spedito', 'Consegnato'])).toBe('Annullato');
});

test('Selecting lowest status from normal array 3', () => {
    expect(selectLowestStatus(['Pagato', 'Spedito', 'Consegnato'])).toBe('Pagato');
});