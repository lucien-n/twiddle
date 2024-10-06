import type { Like, Prisma } from '@prisma/client';
import { getProfileSelect } from './profile';

export const isLiked = (
	currentUserId: string | undefined,
	likes: Pick<Like, 'userId'>[]
): boolean => !!currentUserId && likes.some(({ userId }) => currentUserId === userId);

export const getPostBaseSelect = (currentUserId?: string): Prisma.PostSelect => ({
	id: true,
	edited: true,
	content: true,
	createdAt: true,
	likeCount: true,
	author: { select: getProfileSelect() },
	likes: { where: { userId: currentUserId } }
});

export const getPostSelect = (currentUserId?: string): Prisma.PostSelect => ({
	...getPostBaseSelect(currentUserId),
	sourcePost: { select: getPostBaseSelect(currentUserId) }
});

export const getPostOrderBy = (
	orderBy?: Prisma.PostOrderByWithRelationInput
): Prisma.PostOrderByWithRelationInput => ({
	createdAt: 'desc',
	...orderBy
});

export const getPostWhere = (where?: Prisma.PostWhereInput): Prisma.PostWhereInput => ({
	OR: [{ deleted: false }, { deleted: null }],
	...where
});
