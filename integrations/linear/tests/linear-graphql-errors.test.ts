import { describe, expect, it, vi } from 'vitest';

import getCycleAction from '../actions/get-cycle.js';
import listCyclesAction from '../actions/list-cycles.js';
import listProjectsAction from '../actions/list-projects.js';
import unarchiveProjectAction from '../actions/unarchive-project.js';

import type { NangoActionLocal } from '../actions/get-cycle.js';

class ActionErrorMock extends Error {
    payload: Record<string, unknown>;

    constructor(payload: Record<string, unknown>) {
        super(typeof payload['message'] === 'string' ? payload['message'] : 'action error');
        this.payload = payload;
    }
}

function makeNango(responseData: unknown): NangoActionLocal {
    return {
        post: vi.fn().mockResolvedValue({ data: responseData }),
        ActionError: ActionErrorMock
    } as unknown as NangoActionLocal;
}

const graphqlErrorResponse = {
    data: null,
    errors: [{ message: 'Entity not found or you do not have access to it.' }]
};

describe('linear GraphQL errors[] surface as graphql_error instead of Zod/shape failures', () => {
    it('get-cycle throws graphql_error', async () => {
        const nango = makeNango(graphqlErrorResponse);

        await expect(getCycleAction.exec(nango, { id: 'cycle-1' })).rejects.toMatchObject({
            payload: {
                type: 'graphql_error',
                message: 'Entity not found or you do not have access to it.'
            }
        });
    });

    it('get-cycle still reports not_found when cycle is null without errors', async () => {
        const nango = makeNango({ data: { cycle: null } });

        await expect(getCycleAction.exec(nango, { id: 'cycle-1' })).rejects.toMatchObject({
            payload: { type: 'not_found' }
        });
    });

    it('list-cycles throws graphql_error', async () => {
        const nango = makeNango(graphqlErrorResponse);

        await expect(listCyclesAction.exec(nango, {})).rejects.toMatchObject({
            payload: {
                type: 'graphql_error',
                message: 'Entity not found or you do not have access to it.'
            }
        });
    });

    it('list-projects throws graphql_error', async () => {
        const nango = makeNango(graphqlErrorResponse);

        await expect(listProjectsAction.exec(nango, {})).rejects.toMatchObject({
            payload: {
                type: 'graphql_error',
                message: 'Entity not found or you do not have access to it.'
            }
        });
    });

    it('unarchive-project throws graphql_error', async () => {
        const nango = makeNango(graphqlErrorResponse);

        await expect(unarchiveProjectAction.exec(nango, { projectId: 'project-1' })).rejects.toMatchObject({
            payload: {
                type: 'graphql_error',
                message: 'Entity not found or you do not have access to it.'
            }
        });
    });
});
