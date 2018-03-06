const spicedPg = require('spiced-pg');
const {dbUser, dbPass} = require('./secrets');
const db = spicedPg(`postgres:${dbUser}:${dbPass}@localhost:5432/petition`);

module.exports.sign = ({ first, last, sig}) => {};

module.exports.getSigners = () => {}
