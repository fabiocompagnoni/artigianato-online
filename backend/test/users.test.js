import app from '../app.js';
import request from 'supertest';
import beforeAllCallback from './waitForServices.js';

//aspettiamo che tutti i servizi siano online prima di usarli
beforeAll(async () => {return beforeAllCallback(app)});

const user_data = {
    email: 'federulli1@gmail.com',
    name: 'Federico',
    surname: 'Rulli',
    password: 'Passwordseria1.',
    role: 'customer'
};

test('Registering user with incorrect email', async () => {
    const new_data = {...user_data};
    new_data.email = 'notanemail';

    const res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(517);
});

test('Registering user with incorrect password', async () => {
    const new_data = {...user_data};
    new_data.password = '.';
    
    const res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(516);
});

test('Registering user with incorrect name', async () => {
    const new_data = {...user_data};
    new_data.name = '';

    const res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(518);
});

test('Registering user with incorrect surname', async () => {
    const new_data = {...user_data};
    new_data.surname = '';

    const res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(518);
});

test('Registering user with incorrect role', async () => {
    const new_data = {...user_data};
    new_data.role = 'admin';

    const res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(522);
});