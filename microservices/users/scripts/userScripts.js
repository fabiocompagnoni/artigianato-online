import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;

function generateUserJWT(user_info) {
    // Assicurati che JWT_SECRET non sia undefined in produzione
    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined!');
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign(
        { user_id: user_info.ID, user_role_id: user_info.id_role, user_role:user_info.roleName },
        JWT_SECRET,
        { expiresIn: '1d' }
    );
}

export function sendUserData(res, user_info, response_code = 200) {
    res.cookie('jwt', generateUserJWT(user_info), {
        httpOnly: true,
        sameSite: 'None',
        secure: true,
        maxAge: 24 * 60 * 60 * 1000
    });
    res.status(response_code).send(
        JSON.stringify({
            email: user_info.email,
            name: user_info.name,
            surname: user_info.surname,
            role:user_info.ID,
            roleName: user_info.roleName,
        })
    );
}