import jwt from 'jsonwebtoken';
import sendError from './sendError.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware di autenticazione JWT
export default function authJWT(req, res, next) {
    try {
        if(!req.cookies) {
            sendError(res, 401);
            return;
        }

        const token = req.cookies.jwt;

        if (typeof token === 'undefined' || !token) {
            // Controlla anche che il token non sia stringa vuota, null o undefined
            sendError(res, 401);
            return;
        }

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                console.error('JWT verification error:', err); // Logga l'errore di verifica
                sendError(res, 403);
                return;
            }
            req.user = user;
            next();
        });
    } catch (err) {
        console.error('AuthJWT catch error:', err);
        sendError(res, 500);
    }
}