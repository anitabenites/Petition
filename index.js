
const express = require('express');
const app = express();
const hb = require('express-handlebars');
app.engine('handlebars', hb());
app.set('view engine', 'handlebars');
const bcrypt = require('bcryptjs');


const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
app.use(cookieParser());
app.use(cookieSession({
 secret: process.env.SECRET || require('./secrets').secrets,
 maxAge: 1000*60*60*24*14
}))


const spicedPg = require('spiced-pg');
let db;
if (process.env.DATABASE_URL) {
    console.log('process env');
    db = spicedPg(process.env.DATABASE_URL);
} else {
    console.log('localhost');
    const {dbUser, dbPass} = require('./secrets')
    db = spicedPg(`postgres:${dbUser}:${dbPass}@localhost:5432/petition`);
}


app.use(require('body-parser').urlencoded({
    extended:false
}));

app.use(express.static(__dirname + '/public'));

//global checking:
app.use(function(request,response,next){
    if(!request.session.user && request.url != '/login' && request.url != '/register') {
        console.log('this requestsession is:', request.session);
        response.redirect('/register')
    }else {
        next()
    }
})


//ROUTES:
app.get('/',(request, response) => {
    response.redirect('/register');
});

app.get('/logout', (request, response) => {
    request.session = null;
    response.redirect('/register');
})

app.get('/petition', (request,response) => {
    console.log('this is lala:', request.session.user);
    if(request.session.user.sigId) {
        return response.redirect('/thanks'); //return finished the statment otherwise I need an else.
    }

    console.log('about to render petition page:', request.session.user)
    response.render('petition', {
        layout:'main',
        firstname: request.session.user.firstname,
        lastname: request.session.user.lastname
    })
})

app.post('/petition',(request, response) => {
    console.log("about to run post-petition:", request.body);
    createNewSigner(request.body.signature, request.session.user.id)
        .then((results) => {
        console.log('the results are:', results.rows)
        request.session.user.sigId = results.rows[0].id;
        // response.cookie('id', results.rows[0].id);
        response.redirect('/thanks');
    })
    .catch((err) => {
        // to render the template petition:
        response.render('petition', {error:true});
        console.log(err);
    })
});


app.get('/register',(request, response) => {
    if(request.session.user) {
        return response.redirect('/petition')
    }
    response.render('register', {
        layout: 'main'
    });
})

app.post('/register',(request,response) => {
    console.log('inside.post/register');
    const { firstname, lastname, email, password } = request.body
    hashPassword(password)
    .then(hashedPassword => {
        console.log(hashedPassword);
        console.log(firstname, lastname, password, email);
        const q = `INSERT INTO users
                    (first_name, last_name, email, hashed_pass)
                    VALUES
                    ($1, $2, $3, $4)
                    RETURNING id`
        const params = [firstname, lastname, email, hashedPassword]

        return db.query(q, params)
            .then(results => {
                console.log("INSERT SUCCESSFUL", results.rows);
                request.session.user = {
                    id: results.rows[0].id,
                    firstname: firstname,
                    lastname:lastname
                }
                response.redirect('/profile')
            })
    }).catch(function(err){
        console.log('there is an error in the post-register:', err.detail);
        response.render('register', {
            layout:'main',
            errorMessage: 'that email is already taken',
             error:true
        })
    })
})



app.get('/profile', (request, response) => {
    response.render('profile', {
        layout: 'main'
    });
})



app.post('/profile', (request, response) => {
    var userData = request.body;
    userData.userID = request.session.user.id
    var q = `INSERT INTO user_profiles (user_id, age, city, homepage) VALUES ($1, $2, $3, $4)`
    var params = [userData.userID, userData.age, userData.city, userData.homepage];
    console.log('this is my params:', params)

    db.query(q, params)
        .then(results => {
            response.redirect('/petition');
        })
        .catch((err) => {
            response.render('profile', {
                "message" : "Could not save to database. Please try again"
            })
        });
})

app.get('/login', (request, response) => {
    if(request.session.user) {
        response.redirect('/thanks')
    }
    response.render('login', {
        layout: 'main',
    })

})


app.post('/login', (request, response) => {
    const { email, password } = request.body
    console.log('Inside-Post/Login: ', email, password)
    const q = 'SELECT first_name, last_name, users.id, hashed_pass, signatures.id AS sigId FROM users left JOIN signatures ON signatures.user_id = users.id WHERE  email = $1'
    const params = [ request.body.email ]
    db.query(q, params)
        .then(results => {
            console.log("results: ", results.rows);
            if(results.rows.length === 0) {
                return response.render('login', {
                    error: 'Email is not registered',
                    layout: 'main'
                })
            }

            console.log('returned user data: ', results.rows)
            checkPassword(password, results.rows[0].hashed_pass)
                .then(doesMatch => {
                    if (doesMatch) {
                        console.log("is the password gut", doesMatch);
                        console.log('the results of the rows:', results.rows);
                        request.session.user = {
                            id: results.rows[0].id,
                            firstname: results.rows[0].first_name,
                            lastname: results.rows[0].last_name,
                            sigId: results.rows[0].sigid
                        }

                        console.log('this is the cookie informationsession:', request.session.user);
                        response.redirect('/thanks')

                    } else {
                        response.render('login', {
                            error: 'something went wrong with your login :(',
                            layout: 'main'
                        })
                    }
                })
        })
})


app.get('/profileEdit', function (request, response) {
    editProfile(request.session.user.id)
        .then(results => {
            // console.log(results.rows);
            response.render('profileEdit', {
            layout: 'main',
            firstname: results.rows[0].first_name,
            lastname: results.rows[0].last_name,
            email: results.rows[0].email,
            age: results.rows[0].age,
            city: results.rows[0].city,
            homepage: results.rows[0].homepage
            })
        })
        .catch(function(err) {
            console.log("this is an error:", err);
        });
    });


app.post('/profileEdit', function(request, response) {
    var q1, q2, q3, params, passparams;
    const { firstname, lastname, email, password, age, city, homepage } = request.body;
    console.log(firstname, lastname, email, password, age, city, homepage);
    request.session.user.firstname = firstname;
    request.session.user.lastname = lastname;
    params = [firstname, lastname, email, request.session.user.id];
    q1 = `UPDATE users SET first_name = $1, last_name = $2, email = $3  WHERE id = $4`;
    db.query(q1, params)
        .then(results => {
            console.log("first query done");
            params = [age, city, homepage, request.session.user.id];
            q2 = `UPDATE user_profiles SET age = $1, city = $2, homepage = $3 WHERE user_id = $4`;
            db.query(q2, params)
                .then(results => {
                    console.log("second query done");
                    if(password === "") {
                        response.redirect('/thanks');
                    }
                })
                .catch((err) => {
                    response.render('profile', {
                        "message" : "Could not save to database. Please try again"
                    });
                })
            })
        .catch((err) => {
            response.render('profile', {
                "message" : "Could not save to database. Please try again"
            });
        })

        if(password !== "") {
            console.log("password changed");
            hashPassword(password)
                .then(hashedPassword => {
                    console.log(hashedPassword);
                    passparams = [hashedPassword, request.session.user.id];
                    q3 = `UPDATE users SET hashed_pass = $1 WHERE id = $2`;
                    db.query(q3, passparams)
                        .then(results => {
                            console.log("third query done");
                            response.redirect('/thanks');
                        })
                        .catch((err) => {
                            response.render('profile', {
                                "message" : "Could not save to database. Please try again"
                            });
                        })
                })
            }

    })

function hashPassword(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
}
function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(textEnteredInLoginForm, hashedPasswordFromDatabase, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
}


app.get('/thanks',(request,response)=>{
    if(!request.session.user.sigId) {
        response.redirect('/petition');
    }
    getOneSigner(request.session.user.sigId)
        .then(results => {
            console.log('this is our id', request.session.user.sigId)
            console.log(results.rows);
            response.render('thanks', {
                signature: results.rows[0].signature,
                layout: 'main'
            })
        });
});

app.get('/signers', (request, response)=> {
    getSigners().then(results => {
        response.render('signers', {
            signers: results.rows,
            layout: 'main'
        })
        console.log('here are all the signers:', results.rows);
    });
})

app.get('/petition/signers/:cityName',(request, response) => {
    const cityName = request.params.cityName;
    selectCity(cityName).then(results => {
        console.log(results);
        response.render('signers', {
            layout: 'main',
            signers: results.rows
        });
    }).catch(function(err){
        console.log('there is an error with the cityName:', err)
    });
});


app.post('/delete', (request, response) => {
    const q = ` DELETE FROM signatures WHERE user_id = $1`;
    const params = [request.session.user.id];
    db.query(q, params)
    .then((results) => {
        console.log(results);
        request.session.user.sigId = false;
        response.redirect('/petition');
    }).catch(err => {
        console.log(err);
    })
});


const selectCity = function(city) {
    const q = `SELECT users.first_name, users.last_name, user_profiles.age , user_profiles.city, user_profiles.homepage FROM signatures
               LEFT JOIN user_profiles
                  ON signatures.user_id = user_profiles.user_id
               LEFT JOIN users
                  ON signatures.user_id = users.id WHERE city = $1`
    return db.query(q,[city])
}

const getOneSigner = function(id) {
    const q = "SELECT * FROM signatures WHERE id = $1"
    const params = [id]
    return db.query(q, params)
}


const getSigners = function() {
    const q = `SELECT users.first_name, users.last_name, user_profiles.age , user_profiles.city, user_profiles.homepage FROM signatures
               LEFT JOIN user_profiles
                  ON signatures.user_id = user_profiles.user_id
               LEFT JOIN users
                  ON signatures.user_id = users.id`
    return db.query(q)
}


const createNewSigner = function(signature, user_id) {
    const q = `INSERT INTO signatures (signature, user_id)
                    VALUES ($1, $2) RETURNING id`

    const params = [signature, user_id]
    return db.query(q, params)
}

const editProfile = function(user_id) {
    const q = `SELECT * FROM users JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.id = $1`
    const params = [user_id]
    return db.query(q,params)
}

app.listen(process.env.PORT || 8080, console.log('I am listening'));
