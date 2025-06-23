import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export default function(passport) {
    passport.use(
        new GoogleStrategy({
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: '/api/auth/google/callback'
            },
            async (accessToken, refreshToken, profile, done) => {
                // Questa è la funzione di 'verify callback'
                // Viene chiamata dopo che Google ha autenticato l'utente e ha restituito le sue informazioni.

                try {
                    //verifico se l'utente e' gia' registrato
                    const response = await fetch(`https://localhost:3000/users/user/${profile.id}`,{
                        method:"GET",
                        credentials:"include"
                    });
                    if(response.status==515){
                        //utente non registrato

                    }
                    let user = null;
                    if (response.ok) {
                        user = await response.json();
                    }
                    //let user = await User.findOne({ googleId: profile.id });

                    if (user) {
                        return done(null, user);
                    } else {
                        let request=await fetch(`https://localhost:3000/users/user/${profile.id}`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            credentials: "include",
                            body: JSON.stringify({
                                googleId: profile.id,
                                name: profile.displayName,
                                email: profile.emails[0].value,
                                role: 'cliente'
                            })
                        });

                        let user=await request.json();
                        return done(null, user);
                    }
                } catch (err) {
                    console.error(err);
                    return done(err, null);
                }
            }
        )
    );

};