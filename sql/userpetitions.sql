DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_profiles;
-- SIGNATURES IS THE SAME AS PETITIONS TABLE:

CREATE TABLE signatures (
    id SERIAL PRIMARY KEY,
    signature TEXT NOT NULL,
    -- change the "signatures tables" --> "it has a column for the user id:"
    user_id INTEGER NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_pass VARCHAR(255) NOT NULL,
    -- to record the time at which the user was created!!:
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    age INTEGER,
    city VARCHAR(255),
    homepage VARCHAR(255),
    user_id INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);
