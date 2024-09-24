import type { Profile } from '@prisma/client';
import type { Session, User } from 'lucia';
import { getContext, setContext } from 'svelte';

export interface SetAuthState {
	user: User | null;
	session: Session | null;
	profile: Profile | null;
}

export class AuthState {
	user: User | null = $state(null);
	session: Session | null = $state(null);
	profile: Profile | null = $state(null);

	openSignOutDialog: boolean = $state(false);

	constructor({ user, session, profile }: SetAuthState) {
		this.user = user;
		this.session = session;
		this.profile = profile;
	}

	toggleOpenSignOutDialog() {
		this.openSignOutDialog = !this.openSignOutDialog;
	}
}

const CTX = Symbol('auth_ctx');

export const setAuthState = (init: SetAuthState): AuthState => {
	const authState = new AuthState(init);
	setContext<AuthState>(CTX, authState);
	return authState;
};

export const getAuthState = (): AuthState => getContext<AuthState>(CTX);
