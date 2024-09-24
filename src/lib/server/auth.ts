import type { Prisma, Profile, User } from '@prisma/client';
import type { RequestEvent } from '@sveltejs/kit';
import { prisma } from './prisma';
import { hash, verify } from '@node-rs/argon2';
import { AuthError, AuthErrorCode } from '$lib/utils/auth-error';
import { nanoid } from 'nanoid';
import { lucia } from './lucia';
import { generateHandle } from '$lib/utils/helpers';

export const hashOptions = {
	memoryCost: 19456,
	timeCost: 2,
	outputLen: 32,
	parallelism: 1
};

export const getUser = async (
	{ handle, email }: { handle?: string; email?: string },
	select?: Prisma.UserSelect
) => {
	return prisma.user.findFirst({
		where: { OR: [{ profile: { some: { handle } } }, { email }] },
		select
	});
};

export const hashPassword = async (password: string) => hash(password, hashOptions);

export const verifyPassword = async (password: string, hashed: string) =>
	verify(hashed, password, hashOptions);

export const signUpWithEmailAndPassword = async (
	event: RequestEvent,
	email: string,
	password: string,
	meta: Pick<Profile, 'displayName' | 'handle'>
): Promise<User> => {
	const generatedHandle = generateHandle(meta.displayName);
	if (meta.handle !== generatedHandle) throw new AuthError(AuthErrorCode.InvalidHandle);

	const existingUserHandle = await getUser({ handle: meta.handle });
	if (existingUserHandle) throw new AuthError(AuthErrorCode.HandleAlreadyInUse);

	const existingUserEmail = await getUser({ email });
	if (existingUserEmail) throw new AuthError(AuthErrorCode.EmailAlreadyInUse);

	const hashedPassword = await hashPassword(password);
	const id = nanoid();
	const user = await prisma.user.create({
		data: {
			id,
			email,
			passwordHash: hashedPassword,
			profile: { create: meta },
			interfaceSettings: { create: {} },
			privacySettings: { create: {} }
		}
	});

	await createSession(id, event);

	return user;
};

export const signInWithEmailAndPassword = async (
	event: RequestEvent,
	email: string,
	password: string
): Promise<void> => {
	const existingUser = await getUser({ email }, { id: true, passwordHash: true });
	if (!existingUser) {
		throw new AuthError(AuthErrorCode.InvalidCredentials);
	}

	const validPassword = await verifyPassword(password, existingUser.passwordHash);
	if (!validPassword) {
		throw new AuthError(AuthErrorCode.InvalidCredentials);
	}

	await createSession(existingUser.id, event);
};

export const refreshSession = async (event: RequestEvent) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return;
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}

	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}

	event.locals.user = user;
	event.locals.session = session;
};

export const createSession = async (userId: string, event: RequestEvent) => {
	const session = await lucia.createSession(userId, {});
	const sessionCookie = lucia.createSessionCookie(session.id);

	event.cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes
	});
};
