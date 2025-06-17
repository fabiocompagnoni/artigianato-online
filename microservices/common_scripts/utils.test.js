import { getTrimmedName } from "./utils";

test('Empty string', () => {
    expect(getTrimmedName('')).toBe('');
});

test('Trimmed name 1', () => {
    expect(getTrimmedName('Paolo')).toBe('paolo');
});

test('Trimmed name 2', () => {
    expect(getTrimmedName('Isgrò')).toBe('isgr');
});

test('Trimmed name 3', () => {
    expect(getTrimmedName('Marco Parisi')).toBe('marcoparisi');
});

test('Trimmed name 4', () => {
    expect(getTrimmedName('us3rname_not:standard@#!')).toBe('usrnamenotstandard');
});