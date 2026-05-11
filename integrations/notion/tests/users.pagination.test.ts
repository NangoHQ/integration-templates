import { describe, expect, test, vi } from 'vitest';
import fetchData from '../syncs/users.js';

const makeNango = (overrides: Record<string, any> = {}) => ({
    getCheckpoint: vi.fn().mockResolvedValue(null),
    saveCheckpoint: vi.fn().mockResolvedValue(undefined),
    clearCheckpoint: vi.fn().mockResolvedValue(undefined),
    trackDeletesStart: vi.fn().mockResolvedValue(undefined),
    trackDeletesEnd: vi.fn().mockResolvedValue(undefined),
    batchSave: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    ...overrides
});

const makeResponse = (users: any[], hasMore: boolean, nextCursor?: string) => ({
    data: {
        object: 'list',
        results: users,
        has_more: hasMore,
        next_cursor: nextCursor ?? null
    }
});

const mockUser = (id: string) => ({
    id,
    object: 'user',
    type: 'person',
    name: 'Test User',
    avatar_url: null
});

describe('Notion Users Pagination', () => {
    test('should fetch a single page and call lifecycle methods', async () => {
        const nango = makeNango({
            get: vi.fn().mockResolvedValue(makeResponse([mockUser('user1')], false))
        });

        await fetchData.exec(nango as any);

        expect(nango.trackDeletesStart).toHaveBeenCalledWith('User');
        expect(nango.get).toHaveBeenCalledOnce();
        expect(nango.get).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint: '/v1/users', params: expect.objectContaining({ page_size: 100 }) })
        );
        expect(nango.batchSave).toHaveBeenCalledWith([{ id: 'user1', type: 'person', name: 'Test User' }], 'User');
        expect(nango.trackDeletesEnd).toHaveBeenCalledWith('User');
    });

    test('should paginate across multiple pages', async () => {
        const nango = makeNango({
            get: vi
                .fn()
                .mockResolvedValueOnce(makeResponse([mockUser('user1')], true, 'cursor1'))
                .mockResolvedValueOnce(makeResponse([mockUser('user2')], false))
        });

        await fetchData.exec(nango as any);

        expect(nango.get).toHaveBeenCalledTimes(2);
        expect(nango.get).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ params: expect.objectContaining({ page_size: 100 }) })
        );
        expect(nango.get).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ params: expect.objectContaining({ start_cursor: 'cursor1' }) })
        );
        expect(nango.saveCheckpoint).toHaveBeenCalledWith({ start_cursor: 'cursor1' });
        expect(nango.batchSave).toHaveBeenCalledTimes(2);
        expect(nango.clearCheckpoint).toHaveBeenCalled();
    });

    test('should resume from a saved checkpoint', async () => {
        const nango = makeNango({
            getCheckpoint: vi.fn().mockResolvedValue({ start_cursor: 'saved-cursor' }),
            get: vi.fn().mockResolvedValue(makeResponse([mockUser('user1')], false))
        });

        await fetchData.exec(nango as any);

        expect(nango.get).toHaveBeenCalledWith(
            expect.objectContaining({ params: expect.objectContaining({ start_cursor: 'saved-cursor' }) })
        );
    });

    test('should skip batchSave when results are empty', async () => {
        const nango = makeNango({
            get: vi.fn().mockResolvedValue(makeResponse([], false))
        });

        await fetchData.exec(nango as any);

        expect(nango.batchSave).not.toHaveBeenCalled();
        expect(nango.trackDeletesEnd).toHaveBeenCalledWith('User');
    });

    test('should throw when response fails schema validation', async () => {
        const nango = makeNango({
            get: vi.fn().mockResolvedValue({ data: { unexpected: true } })
        });

        await expect(fetchData.exec(nango as any)).rejects.toThrow('Failed to parse users response');
    });

    test('should map user fields correctly including optional ones', async () => {
        const nango = makeNango({
            get: vi.fn().mockResolvedValue(
                makeResponse(
                    [
                        { id: 'u1', object: 'user', type: 'bot', name: 'My Bot', avatar_url: 'https://example.com/avatar.png' },
                        { id: 'u2', object: 'user', type: 'person', name: null, avatar_url: null }
                    ],
                    false
                )
            )
        });

        await fetchData.exec(nango as any);

        expect(nango.batchSave).toHaveBeenCalledWith(
            [
                { id: 'u1', type: 'bot', name: 'My Bot', avatar_url: 'https://example.com/avatar.png' },
                { id: 'u2', type: 'person' }
            ],
            'User'
        );
    });
});
