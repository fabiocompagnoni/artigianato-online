import { isBodyString, isPrice, isBodyInt } from "./bodyTypeChecker";

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


//isBodyInt
test('Value is negativa and can be', () => {
    expect(isBodyInt(-150, false)).toBe(true);
});

test('Value is negativa and can\'t be', () => {
    expect(isBodyInt(-150, true)).toBe(false);
});

test('Value is a float', () => {
    expect(isBodyInt(150.15, false)).toBe(false);
});

test('Value is a correct string', () => {
    expect(isBodyInt('-150', false)).toBe(true);
});

test('Value is a correct string and can\'t be negative', () => {
    expect(isBodyInt('-150', true)).toBe(false);
});

test('Value is a string that represents a float', () => {
    expect(isBodyInt('150.15', true)).toBe(false);
});

test('Value is an incorrect string', () => {
    expect(isBodyInt('prova prova', true)).toBe(false);
});

test('Value is an object', () => {
    expect(isBodyInt({}, true)).toBe(false);
});

test('Value is true', () => {
    expect(isBodyInt(true, true)).toBe(false);
});