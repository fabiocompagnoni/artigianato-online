import app from '../app.js';
import request from 'supertest';
import beforeAllCallback from './waitForServices.js';

//aspettiamo che tutti i servizi siano online prima di usarli
beforeAll(async () => {return beforeAllCallback(app)});

test('GET / should return status ok', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
});

test('GET /users should return status ok', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
});

test('GET /products/status should return status ok', async () => {
    const res = await request(app).get('/products/status');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
});

test('GET /images should return status ok', async () => {
    const res = await request(app).get('/images');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
});

test('GET /purchases should return status ok', async () => {
    const res = await request(app).get('/purchases');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
});

test('GET /tickets should return status ok', async () => {
    const res = await request(app).get('/tickets');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
});