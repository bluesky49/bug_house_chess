const pgp = require('pg-promise')();
const path = require('path');
const config = require('../config');
const { Client } = require('pg');
const fs = require('fs');

const connection = 'postgres://postgres:111@localhost:5432/bughouse';
const client = new Client({
	connectionString: connection
});
client.connect();

const db = pgp(config.database);
const sqlFilesDir = path.join(__dirname, '..', 'sql');
const loadedSqlFiles = {};

function sqlFile(filePath) {
	const sqlFilePath = path.join(sqlFilesDir, filePath);
	if (loadedSqlFiles[sqlFilePath] === undefined) {
		loadedSqlFiles[sqlFilePath] = new pgp.QueryFile(path.join(sqlFilesDir, filePath), { minify: true });
	}
	return loadedSqlFiles[sqlFilePath];
}

function readSQLFile(filepath) {
	const sqlFilePath = path.join(sqlFilesDir, filepath);
	const query = fs.readFileSync(sqlFilePath).toString();
	return query;
}
async function createSchema() {
	/* eslint-disable global-require */
	const User = require('./User');
	const Game = require('./Game');
	const Rating = require('./Rating');
	await User.createTable();
	await Rating.createRatingTypesEnum();
	await Rating.createTable();
	await Game.createTable();
}

function stopDB() {
	pgp.end();
}

module.exports = {
	db,
	sqlFile,
	readSQLFile,
	createSchema,
	pgp,
	stopDB,
	client
};
