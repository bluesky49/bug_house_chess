import * as gameActions from '../actions/game';

const defaultState = {
	game: {},
	userPosition: null,
	moves: []
};

export default function user(state = defaultState, action) {
	switch (action.type) {
		case gameActions.UPDATE_MOVES:
			return {
				...state,
				moves: action.moves
			};
		case gameActions.RECEIVE_GAME_INFO: {
			const game = action.data;
			const userID = action.userID;
			let userPosition;
			if (game.player1.id === userID) {
				userPosition = 1;
			} else if (game.player2.id === userID) {
				userPosition = 2;
			} else if (game.player3.id === userID) {
				userPosition = 3;
			} else {
				userPosition = 4;
			}
			return {
				...state,
				game,
				userPosition
			};
		}
		default:
			return state;
	}
}
