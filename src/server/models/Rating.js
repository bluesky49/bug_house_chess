const glicko = require('glicko2');
const database = require('./database');

const db = database.db;
const sqlFile = database.sqlFile;

class Rating {
	constructor(ratingType, ratingTimestamp, rating) {
		this.ratingType = ratingType;
		this.ratingTimestamp = ratingTimestamp;
		this.rating = rating;
	}

	static createTable = async () => {
		const res = await database.client.query(`CREATE TABLE IF NOT EXISTS ratings (
			user_id SERIAL NOT NULL REFERENCES users(id),
			rating_type rating_type NOT NULL,
			rating_timestamp TIMESTAMP NOT NULL,
			rating REAL NOT NULL,
			PRIMARY KEY (user_id, rating_timestamp, rating_type)
		);

		CREATE VIEW users_with_most_recent_ratings AS
		SELECT * FROM (
			SELECT
				new_ratings.user_id AS user_id,
				MAX(new_ratings.rating) FILTER (WHERE new_ratings.rating_type = 'bullet') AS rating_bullet,
				MAX(new_ratings.rating) FILTER (WHERE new_ratings.rating_type = 'blitz') AS rating_blitz,
				MAX(new_ratings.rating) FILTER (WHERE new_ratings.rating_type = 'classical') AS rating_classical
			FROM
				(
					SELECT
						DISTINCT ON (u.id, rts.rating_type)
						u.id AS user_id,
						rts.rating_type AS rating_type,
						rts.rating AS rating
					FROM users u
						LEFT JOIN ratings rts ON u.id = rts.user_id
					ORDER BY u.id, rts.rating_type, rts.rating_timestamp DESC
				) new_ratings
			GROUP BY new_ratings.user_id
			) AS most_recent_ratings
		INNER JOIN users u ON u.id = most_recent_ratings.user_id;
		`);
		// return db.none(sqlFile('rating/create_ratings_tables.sql'));
		return res;
	}

	static createRatingTypesEnum = async () => {
		const res = await database.client.query(`CREATE TYPE rating_type AS ENUM('bullet', 'blitz', 'classical');
		`);
		// return db.none(sqlFile('rating/create_rating_type_enum.sql'));
		return res;
	}

	static mapRow(row) {
		return new Rating(row.rating_type, row.rating_timestamp, Math.round(row.rating));
	}

	static async getRatings(username) {
		const rows = await db.many(sqlFile('rating/get_ratings_by_username.sql'), { username: username });
		return rows.map(row => Rating.mapRow(row));
	}

	/**
	 * Returns a promise to update four players ratings (to be used at the end of a game)
	 * @param {Object} game
	 * @param {string} winner Either 'team1' (1 and 4 won), 'team2' (2 and 3 won), or 'draw'
	 * @returns {Promise.<>}
	 */
	static async updateRatings(game, winner) {
		const User = require('./User'); // eslint-disable-line global-require
		try {
			const rows = await db.any(sqlFile('user/get_associated_users.sql'), { id1: game.player1, id2: game.player2, id3: game.player3, id4: game.player4 });
			const users = rows.map(User.mapRow);
			const settings = {
				tau: 0.5,
				rating: 1500,
				rd: 350,
				vol: 0.06
			};
			const ranking = new glicko.Glicko2(settings);
			let player1;
			let player2;
			let player3;
			let player4;
			let race;
			let ratingType;
			let updateRdMode;
			if (game.minutes < 3) {
				player1 = ranking.makePlayer(users[0].ratingBullet, users[0].rdBullet, 0.06);
				player2 = ranking.makePlayer(users[1].ratingBullet, users[1].rdBullet, 0.06);
				player3 = ranking.makePlayer(users[2].ratingBullet, users[2].rdBullet, 0.06);
				player4 = ranking.makePlayer(users[3].ratingBullet, users[3].rdBullet, 0.06);
				ratingType = 'bullet';
				updateRdMode = 'rd_bullet';
			} else if (game.minutes >= 3 && game.minutes <= 8) {
				player1 = ranking.makePlayer(users[0].ratingBlitz, users[0].rdBlitz, 0.06);
				player2 = ranking.makePlayer(users[1].ratingBlitz, users[1].rdBlitz, 0.06);
				player3 = ranking.makePlayer(users[2].ratingBlitz, users[2].rdBlitz, 0.06);
				player4 = ranking.makePlayer(users[3].ratingBlitz, users[3].rdBlitz, 0.06);
				ratingType = 'blitz';
				updateRdMode = 'rd_blitz';
			} else {
				player1 = ranking.makePlayer(users[0].ratingClassical, users[0].rdClassical, 0.06);
				player2 = ranking.makePlayer(users[1].ratingClassical, users[1].rdClassical, 0.06);
				player3 = ranking.makePlayer(users[2].ratingClassical, users[2].rdClassical, 0.06);
				player4 = ranking.makePlayer(users[3].ratingClassical, users[3].rdClassical, 0.06);
				ratingType = 'classical';
				updateRdMode = 'rd_classical';
			}
			if (winner === 'team1') { // players 1 and 4 won
				race = ranking.makeRace([[player1, player4], [player2, player3]]);
			} else if (winner === 'team2') { // players 2 and 3 won
				race = ranking.makeRace([[player2, player3], [player1, player4]]);
			} else { // game drawn
				race = ranking.makeRace([[player1, player2, player3, player4]]);
			}
			ranking.updateRatings(race);
			const updateRdArgs = {
				updateRdMode: updateRdMode,
				id1: game.player1,
				id2: game.player2,
				id3: game.player3,
				id4: game.player4,
				p1Value: player1.getRd(),
				p2Value: player2.getRd(),
				p3Value: player3.getRd(),
				p4Value: player4.getRd(),
			};
			await db.tx(t => t.batch([
				t.none(sqlFile('rating/insert_ratings.sql'), {
					id: game.player1,
					rating: player1.getRating(),
					ratingType
				}),
				t.none(sqlFile('rating/insert_ratings.sql'), {
					id: game.player2,
					rating: player2.getRating(),
					ratingType
				}),
				t.none(sqlFile('rating/insert_ratings.sql'), {
					id: game.player3,
					rating: player3.getRating(),
					ratingType
				}),
				t.none(sqlFile('rating/insert_ratings.sql'), {
					id: game.player4,
					rating: player4.getRating(),
					ratingType
				}),
				t.none(sqlFile('user/update_rd.sql'), updateRdArgs)
			]));
		} catch (err) {
			throw err;
		}
	}
}

module.exports = Rating;
