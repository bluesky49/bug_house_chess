import React from 'react';
import UserLinkComponent from '../common/UserLinkComponent';
import './css/userList.css';

export default function UserListComponent(props) {
	return (
		<div>
			{props.data.map(user =>
				<div key={user.username}>
					<div className="inline-block">
						<UserLinkComponent user={user} />
					</div>
					<div className="brighter-color rating-right">{Math.round(user[props.ratingType])}</div>
				</div>
			)}
		</div>
	);
}
