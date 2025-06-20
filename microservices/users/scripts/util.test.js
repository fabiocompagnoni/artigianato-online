import { generatePasswordHash, comparePassword, checkPasswordFormat, checkEmailFormat } from "./util";

test('Password gets correctly encrypted', () => {
    const text = 'myPassword';
    const encrypted = generatePasswordHash(text);
    expect(comparePassword(text, encrypted)).toBe(true);
});

test('Password is rejected', () => {
    const text = 'myPassword';
    const encrypted = generatePasswordHash(text);
    expect(comparePassword('wrongPassword', encrypted)).toBe(false);
});

test('Password format is correct', () => {
    expect(checkPasswordFormat('Correctpass1.')).toBe(true);
});

test('Password format is too short', () => {
    expect(checkPasswordFormat('Sp1.')).toBe(false);
});

test('Password format is too long', () => {
    expect(checkPasswordFormat('Sp1.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
});

test('Password format missing requirements', () => {
    expect(checkPasswordFormat('aaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
});

test('Email is well formed', () => {
    expect(checkEmailFormat('lorisbiavetti@studenti.uninsubria.it')).toBe(true);
});

test('Email is incorrectly formed', () => {
    expect(checkEmailFormat('test@email')).toBe(false);
});