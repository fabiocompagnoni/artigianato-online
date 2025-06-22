import app from '../app.js';
import request from 'supertest';
import path from 'path';
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

test('Registering and logging in user', async () => {
    const new_data = {...user_data};
    new_data.email = 'mauriziorulli@gmail.com';
    new_data.name = 'Maurizio';

    let res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe(new_data.name);
    expect(res.body.email).toBe(new_data.email);
    expect(res.body.surname).toBe(new_data.surname);

    const login_data = {email: new_data.email, password: new_data.password};

    res = await request(app)
        .post('/users/login')
        .send(login_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe(new_data.name);
    expect(res.body.email).toBe(new_data.email);
    expect(res.body.surname).toBe(new_data.surname);
});

test('Registering and fetching user data', async () => {
    const new_data = {...user_data};
    new_data.email = 'paolorulli@gmail.com';
    new_data.name = 'Paolo';

    let res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);

    const cookies = res.headers['set-cookie'];
    const jwtCookie = cookies.find(cookie => cookie.startsWith('jwt='));

    res = await request(app)
        .get('/users/user')
        .set('Cookie', jwtCookie);
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe(new_data.name);
    expect(res.body.surname).toBe(new_data.surname);
    expect(res.body.role).toBe(new_data.role);
    expect(res.body.bio).toBe(null);
    expect(res.body.url_profile_picture).toBe(null);
});

test('Registering two users with same email', async () => {
    const new_data = {...user_data};
    new_data.email = 'massimorulli@gmail.com';
    new_data.name = 'Massimo';

    let res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);

    res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(512);
});

test('Change and get user informations', async () => {
    const new_data = {...user_data};
    new_data.email = 'svetoniorulli@gmail.com';
    new_data.name = 'Svetonio';

    let res = await request(app)
        .post('/users/user')
        .send(new_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);

    const cookies = res.headers['set-cookie'];
    const jwtCookie = cookies.find(cookie => cookie.startsWith('jwt='));

    res = await request(app)
        .post('/images/upload')
        .set('Cookie', jwtCookie)
        .attach('image', path.resolve(process.cwd(), './test/images/avatar1.png'));
    expect(res.statusCode).toBe(200);

    const avatar_id = res.body.file_id;

    new_data.name = 'Patrizio';
    new_data.surname = 'Spauracchi';
    new_data.email = 'patspaur@gmail.com';
    new_data.bio = 'Ciao mi chiamo patrizio';
    new_data.password = 'Nuovapassword1.';
    new_data.id_profile_picture = avatar_id;

    res = await request(app)
        .put('/users/user')
        .send(new_data)
        .set({
            'Content-Type': 'application/json',
            'Cookie': jwtCookie
        });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.password_changed).toBe(true);
    expect(res.body.name).toBe(new_data.name);
    expect(res.body.surname).toBe(new_data.surname);
    expect(res.body.email).toBe(new_data.email);
    expect(res.body.bio).toBe(new_data.bio);
    expect(res.body.id_profile_picture).toBe(new_data.id_profile_picture);
    
    res = await request(app)
        .get('/users/user/svetonio-rulli');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe(new_data.name);
    expect(res.body.surname).toBe(new_data.surname);
    expect(res.body.role).toBe(new_data.role);
    expect(res.body.bio).toBe(new_data.bio);
    expect(res.body.url_profile_picture).toBe('https://localhost:3000/images/' + avatar_id);
});