const _ = require('lodash');
const database = require('./database');
const User = require('./User');
const Rating = require('./Rating');

const db = database.db;
const sqlFile = database.sqlFile;

class Game {
	constructor(id, player1, player2, player3, player4, minutes, increment, ratingRange,
				mode, status, termination, joinRandom, timestamp, clocks, moves, leftLastTime, rightLastTime,
				leftFens, rightFens, leftReserveWhite, leftReserveBlack, rightReserveWhite, rightReserveBlack,
				leftPromotedPieces, rightPromotedPieces, leftLastMove, rightLastMove, leftColorToPlay,
				rightColorToPlay, resignState, drawState) {
		this.id = id;
		this.player1 = player1;
		this.player2 = player2;
		this.player3 = player3;
		this.player4 = player4;
		this.minutes = minutes;
		this.increment = increment;
		this.ratingRange = ratingRange;
		this.mode = mode;
		this.status = status;
		this.termination = termination;
		this.joinRandom = joinRandom;
		this.timestamp = timestamp;
		this.clocks = clocks;
		this.moves = moves;
		this.left_last_time = leftLastTime;
		this.right_last_time = rightLastTime;
		this.left_fens = leftFens;
		this.right_fens = rightFens;
		this.left_reserve_white = leftReserveWhite;
		this.left_reserve_black = leftReserveBlack;
		this.right_reserve_white = rightReserveWhite;
		this.right_reserve_black = rightReserveBlack;
		this.left_promoted_pieces = leftPromotedPieces;
		this.right_promoted_pieces = rightPromotedPieces;
		this.left_last_move = leftLastMove;
		this.right_last_move = rightLastMove;
		this.left_color_to_play = leftColorToPlay;
		this.right_color_to_play = rightColorToPlay;
		this.resign_state = resignState;
		this.draw_state = drawState;
	}

	static createTable = async () => {
		const res = await database.client.query(`CREATE TABLE IF NOT EXISTS games (
			id TEXT PRIMARY KEY NOT NULL,
			moves TEXT NULL,
			left_fens TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
			right_fens TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
			left_reserve_white TEXT NULL,
			left_reserve_black TEXT NULL,
			right_reserve_white TEXT NULL,
			right_reserve_black TEXT NULL,
			left_promoted_pieces TEXT NULL,
			right_promoted_pieces TEXT NULL,
			left_last_move TEXT NULL DEFAULT '[]',
			right_last_move TEXT NULL DEFAULT '[]',
			left_color_to_play TEXT NULL DEFAULT 'white',
			right_color_to_play TEXT NULL DEFAULT 'white',
			minutes SMALLINT NOT NULL DEFAULT 5,
			increment SMALLINT NOT NULL DEFAULT 5,
			rating_range TEXT NULL DEFAULT '0,3000',
			mode TEXT NOT NULL DEFAULT 'Casual',
			status TEXT NOT NULL DEFAULT 'open',
			timestamp TIMESTAMP NOT NULL,
			left_last_time BIGINT NULL,
			right_last_time BIGINT NULL,
			clocks TEXT NULL DEFAULT '0,0,0,0',
			termination TEXT NULL,
			join_random BOOLEAN NULL DEFAULT TRUE,
			resign_state TEXT NULL DEFAULT '0,0,0,0',
			draw_state TEXT NULL DEFAULT '0,0,0,0',
			player1 INT NULL REFERENCES users (id),
			player2 INT NULL REFERENCES users (id),
			player3 INT NULL REFERENCES users (id),
			player4 INT NULL REFERENCES users (id),
			player1_rating INT NULL,
			player2_rating INT NULL,
			player3_rating INT NULL,
			player4_rating INT NULL
		);
		`);
		// return db.none(sqlFile('game/create_games_table.sql'));
		return res;
	}

	static mapRow(row) {
		return new Game(
			row.id, row.player1, row.player2, row.player3, row.player4,
			row.minutes, row.increment, row.rating_range, row.mode, row.status, row.termination, row.join_random,
			row.timestamp, row.clocks, row.moves, row.left_last_time, row.right_last_time, row.left_fens, row.right_fens,
			row.left_reserve_white, row.left_reserve_black,	row.right_reserve_white, row.right_reserve_black,
			row.left_promoted_pieces, row.right_promoted_pieces, row.left_last_move, row.right_last_move,
			row.left_color_to_play, row.right_color_to_play, row.resign_state, row.draw_state
		);
	}

	static mapRowGameWithUsers(row) {
		const mappedObj = {
			player1: {},
			player2: {},
			player3: {},
			player4: {},
		};
		_.forOwn(row, (value, key) => {
			if (key.substring(0, 6) === 'player') {
				if (key[6] === '1') {
					mappedObj.player1[key.substring(7)] = value;
				} else if (key[6] === '2') {
					mappedObj.player2[key.substring(7)] = value;
				} else if (key[6] === '3') {
					mappedObj.player3[key.substring(7)] = value;
				} else {
					mappedObj.player4[key.substring(7)] = value;
				}
			} else {
				mappedObj[key] = value;
			}
		});
		return mappedObj;
	}

	static async getAll() {
		const rows = await db.any(sqlFile('game/get_all_games.sql'));
		return rows.map(Game.mapRow);
	}

	static async getAllOpen() {
		// const rows = await db.any(sqlFile('game/get_all_open_games.sql'));
		const { rows } = await database.client.query(`SELECT
			g.id,
			g.minutes,
			g.increment,
			g.rating_range AS "ratingRange",
			g.mode,
			g.status,
			g.timestamp,
			g.join_random AS "joinRandom",
			player1.id AS player1id,
			player1.username AS player1username,
			player1.title AS player1title,
			player1.rating_bullet AS "player1ratingBullet",
			player1.rating_blitz AS "player1ratingBlitz",
			player1.rating_classical AS "player1ratingClassical",
			player2.id AS player2id,
			player2.username AS player2username,
			player2.title AS player2title,
			player2.rating_bullet AS "player2ratingBullet",
			player2.rating_blitz AS "player2ratingBlitz",
			player2.rating_classical AS "player2ratingClassical",
			player3.id AS player3id,
			player3.username AS player3username,
			player3.title AS player3title,
			player3.rating_bullet AS "player3ratingBullet",
			player3.rating_blitz AS "player3ratingBlitz",
			player3.rating_classical AS "player3ratingClassical",
			player4.id AS player4id,
			player4.username AS player4username,
			player4.title AS player4title,
			player4.rating_bullet AS "player4ratingBullet",
			player4.rating_blitz AS "player4ratingBlitz",
			player4.rating_classical AS "player4ratingClassical"
		FROM games AS g
			LEFT JOIN users_with_most_recent_ratings player1 ON g.player1 = player1.id
			LEFT JOIN users_with_most_recent_ratings player2 ON g.player2 = player2.id
			LEFT JOIN users_with_most_recent_ratings player3 ON g.player3 = player3.id
			LEFT JOIN users_with_most_recent_ratings player4 ON g.player4 = player4.id
		WHERE status = 'open'
		ORDER by timestamp ASC;
		`);
		return rows.map(Game.mapRowGameWithUsers);
	}

	static getByID = async (id) => {
		try {
			// const row = await db.oneOrNone(sqlFile('game/get_game_by_id.sql'), { id: id });
			const {rows} = await database.client.query(`SELECT * FROM games WHERE id = '${id}';
			`);
			if (rows.length !== 0) {
				return Game.mapRow(rows[0]);
			}
			const err = new Error();
			err.status = 401;
			throw err;
		} catch (err) {
			if (!err.status) {
				err.status = 500;
			}
			throw err;
		}
	}

	static async getGameWithUsersByID(id) {
		try {
			const row = await db.oneOrNone(sqlFile('game/get_game_with_users_by_id.sql'), { id: id });
			if (row) {
				return Game.mapRowGameWithUsers(row);
			}
			const err = new Error();
			err.status = 401;
			throw err;
		} catch (err) {
			if (!err.status) {
				err.status = 500;
			}
			throw err;
		}
	}

	static async updatePlayer(id, playerPosition, player) {
		try {
			const user = await User.getByID(player);
			const game = await Game.getByID(id);
			let userRating;
			const gameRatingRange = game.ratingRange.split(' - ');
			if (game.minutes < 3) {
				userRating = user.ratingBullet;
			} else if (game.minutes >= 3 && game.minutes <= 8) {
				userRating = user.ratingBlitz;
			} else {
				userRating = user.ratingClassical;
			}
			const playerNum = parseInt(player);
			// Check if player is not already in the game
			if (playerNum !== game.player1 && playerNum !== game.player2 && playerNum !== game.player3 && playerNum !== game.player4) {
				// Check if player's rating is within game rating range and not overriding other player
				if (userRating >= gameRatingRange[0] && userRating <= gameRatingRange[1] && game[playerPosition] === null) {
					const playerRatingColumn = `${playerPosition}_rating`;
					// await db.none(sqlFile('game/update_player_open_game.sql'), { id, playerPosition, player, playerRatingColumn, userRating });
					await database.client.query(`UPDATE games
					SET
						player${playerPosition} = ${player},
						player${playerPosition}_rating = ${userRating}
					WHERE id = ${id};
					`)
					return true;
				}
			}
		} catch (err) {
			return false;
		}
		return false;
	}

	static async removePlayerFromGame(userID, gameID) {
		try {
			const game = await Game.getByID(gameID);
			let userPosition = null;
			let activePlayers = 0;
			if (game.player1 === userID) userPosition = 1;
			else if (game.player2 === userID) userPosition = 2;
			else if (game.player3 === userID) userPosition = 3;
			else if (game.player4 === userID) userPosition = 4;
			if (userPosition === null || game.status !== 'open') {
				const err = new Error();
				err.status = 400;
				throw err;
			}
			if (game.player1 !== null) activePlayers += 1;
			if (game.player2 !== null) activePlayers += 1;
			if (game.player3 !== null) activePlayers += 1;
			if (game.player4 !== null) activePlayers += 1;
			if (activePlayers > 1) {
				await database.client.query(`UPDATE games
				SET
					player${userPosition} = null,
					player${userPosition}_rating = null
				WHERE id = '${gameID}';
				`);

				// await db.none(sqlFile('game/update_player_open_game.sql'), {
				// 	playerPosition: `player${userPosition}`,
				// 	player: null,
				// 	playerRatingColumn: `player${userPosition}_rating`,
				// 	userRating: null,
				// 	id: gameID
				// });
			} else {
				await database.client.query(`DELETE FROM games
				WHERE id='${gameID}';
				`)
				// await db.none(sqlFile('game/remove_game.sql'), { id: gameID });
			}
		} catch (err) {
			console.log(err, '----------');
			if (!err.status) {
				err.status = 500;
			}
			throw err;
		}
	}

	static async tryToStartGame(id) {
		const game = await Game.getByID(id);
		if (game.player1 !== null && game.player2 !== null && game.player3 !== null && game.player4 !== null) {
			await db.none(sqlFile('game/start_game.sql'), { id });
			return true;
		}
		return false;
	}

	static async createGame(player1 = null, player2 = null, player3 = null, player4 = null, minutes, increment, ratingRange, mode, joinRandom) {
		// Only player1 or player2 will be defined, add initial rating of player who created game to game row, others updated later
		const status = 'open';
		let ratingColumnOfFirstPlayer = 'player1_rating';
		let user;
		let rating;
		if (player2 === null) {
			user = await User.getByID(player1);
		} else {
			ratingColumnOfFirstPlayer = 'player2_rating';
			user = await User.getByID(player2);
		}
		if (minutes < 3) {
			rating = user.ratingBullet;
		} else if (minutes >= 3 && minutes <= 8) {
			rating = user.ratingBlitz;
		} else {
			rating = user.ratingClassical;
		}

		// Calculate random unique game id
		// const rowNumStart = await db.one(sqlFile('game/get_number_games.sql'));
		const { rows } = await database.client.query('SELECT COUNT(*) FROM games;');
		const rowNumStart = parseInt(rows[0].count);
		const numGamesStart = rowNumStart;
		let numGamesEnd = numGamesStart;
		let id;
		while (numGamesStart === numGamesEnd) {
			id = (Math.random() + 1).toString(36).substr(2, 12);
			// await db.none(sqlFile('game/create_game.sql'),
			// { id, player1, player2, player3, player4, minutes, increment, ratingRange, mode, status, joinRandom, ratingColumnOfFirstPlayer, rating });
			await database.client.query(`INSERT INTO games
			(id, minutes, increment, rating_range, mode, status, timestamp, join_random, player1, player2, player3, player4, player1_rating)
			VALUES (
				'${id}',
				${minutes},
				${increment},
				'${ratingRange}',
				'${mode}',
				'${status}',
				now(),
				${joinRandom},
				${player1},
				${player2},
				${player3},
				${player4},
				${rating}
			)
			ON CONFLICT DO NOTHING;
			`);
			// const rowNumEnd = await db.one(sqlFile('game/get_number_games.sql'));
			const rowNumEnd = await database.client.query(`SELECT COUNT(*)
			FROM games;
			`);
			numGamesEnd = rowNumEnd.count;
		}
		return id;
	}

	/**
	 * End a game
	 * @param {Object} game
	 * @param {String} termination
	 * @param {Object} socket
	 * @param {Object} gameSocket
	 * @param {Function} clearRoom
	 * @returns {Promise.<void>}
	 */
	static async endGame(game, termination, socket, gameSocket, clearRoom) {
		const terminationQueryString = 'UPDATE Games SET termination = $1, status = $2 WHERE id = $3';
		await db.none(terminationQueryString, [termination, 'terminated', game.id]);
		gameSocket.in(socket.room).emit('game over', { termination });

		let winner = 'draw';
		if (termination.includes('Team 1 is victorious')) winner = 'team1';
		if (termination.includes('Team 2 is victorious')) winner = 'team2';

		if (game.mode === 'Rated') {
			await Rating.updateRatings(game, winner);
		}
		clearRoom(socket.room, '/game');
	}
}

module.exports = Game;
