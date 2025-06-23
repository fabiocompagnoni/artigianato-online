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

test('Give review to artisan', async () => {
    const artisan_data = {...user_data};
    artisan_data.email = 'artigianorulli@gmail.com';
    artisan_data.name = 'Giuseppe';
    artisan_data.role = 'artisan';

    const customer_data = {...user_data};
    customer_data.email = 'customerrulli@gmail.com';
    customer_data.name = 'Customer';

    const review_data = {
        rating: 5,
        review_text: 'Questo artigiano è molto bravo'
    }

    //registro artigiano e customer
    let res = await request(app)
        .post('/users/user')
        .send(artisan_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);

    //ottengo le info del artisan
    const cookies = res.headers['set-cookie'];
    const jwtCookieArtisan = cookies.find(cookie => cookie.startsWith('jwt='));

    res = await request(app)
        .post('/users/user')
        .send(customer_data)
        .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);

    //ottengo il jwt del customer
    const cookies2 = res.headers['set-cookie'];
    const jwtCookieCustomer = cookies2.find(cookie => cookie.startsWith('jwt='));

    //invio la recensione come customer
    res = await request(app)
        .post('/users/reviewArtisan/giuseppe-rulli')
        .send(review_data)
        .set({
            'Content-Type': 'application/json',
            'Cookie': jwtCookieCustomer
        });
    expect(res.statusCode).toBe(200);
    expect(res.body.artisan).toBe('giuseppe-rulli');
    expect(res.body.rating).toBe(review_data.rating);
    expect(res.body.review_text).toBe(review_data.review_text);

    //provo a inviare la review senza essere loggato
    res = await request(app)
        .post('/users/reviewArtisan/giuseppe-rulli')
        .send(review_data)
        .set({
            'Content-Type': 'application/json'
        });
    expect(res.statusCode).toBe(401);

    //provo a inviare la review come artisan
    res = await request(app)
        .post('/users/reviewArtisan/giuseppe-rulli')
        .send(review_data)
        .set({
            'Content-Type': 'application/json',
            'Cookie': jwtCookieArtisan
        });
    expect(res.statusCode).toBe(403);

    //ottengo le reviews
    res = await request(app)
        .get('/users/reviews/giuseppe-rulli/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.reviews_this_page).toBe(1);
    const my_review = res.body.reviews[0];
    expect(my_review.rating).toBe(review_data.rating);
    expect(my_review.review_text).toBe(review_data.review_text);
});