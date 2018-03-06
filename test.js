
var spicePg = require('spice-pg');

const { dbUser, dbPass } = require('./secrets');

var db = spicedPg (`postgres: ${dbUser}:${dbPass}@localhost:5432/cities`);


function getCity(cityName) {
    return db.query(`SELECT city, population FROM cities
        WHERE city = $1 AND population = $2`,
        [cityName, 986986876]
        ) //the 3r value is an array (security reasons)
        .then(function(results)) {
            return results.rows[0];
            console.log(results.rows);
        }
        .catch(function(err) {
            console.log(err);
        })
}
