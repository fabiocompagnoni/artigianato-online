const error_messages = {
    500: 'Internal server error',
    512: 'Email already registered',
    513: 'Email address not found',
    514: 'Wrong password',
    515: 'User id not found',
    515: 'User not found',
    516: 'Invalid password format',
    517: 'Invalid email format',
    518: 'Invalid user name or surname',
    519: 'Missing file in request body',
    520: 'Image processing failed',
    521: 'Image ID not found',
    400: 'Bad request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found'
};

export default function sendError(res, status) {
    res.status(status).send(
        JSON.stringify({
            error: error_messages[status] || 'Unknown server error',
        })
    );
}