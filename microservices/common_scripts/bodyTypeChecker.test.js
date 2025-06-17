import { isBodyString, isPrice } from "./bodyTypeChecker";

//isBodyString
test('String is empty and can be', () => {
    expect(isBodyString('', false)).toBe(true);
});

test('String is empty and can\'t be', () => {
    expect(isBodyString('', true)).toBe(false);
});

test('Passing object to isBodyString', () => {
    expect(isBodyString({}, true)).toBe(false);
});

test('Passing number to isBodyString', () => {
    expect(isBodyString(15, true)).toBe(false);
});

test('Passing \'true\' to isBodyString', () => {
    expect(isBodyString(true, true)).toBe(false);
});

test('Passing a normal string to isBodyString', () => {
    expect(isBodyString('Prova prova', true)).toBe(true);
});


//isPrice
test('Price is negativa and can be', () => {
    expect(isPrice(-150.15, false)).toBe(true);
});

test('Price is negativa and can\'t be', () => {
    expect(isPrice(-150.15, true)).toBe(false);
});

test('Price is a correct string', () => {
    expect(isPrice('-150.15', false)).toBe(true);
});

test('Price is a correct string and can\'t be negative', () => {
    expect(isPrice('-150.15', true)).toBe(false);
});

test('Price is an incorrect string', () => {
    expect(isPrice('prova prova', true)).toBe(false);
});

test('Price is an object', () => {
    expect(isPrice({}, true)).toBe(false);
});

test('Price is true', () => {
    expect(isPrice(true, true)).toBe(false);
});