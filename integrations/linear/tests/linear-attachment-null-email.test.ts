import { describe, expect, it, vi } from 'vitest';

import getAttachmentAction from '../actions/get-attachment.js';
import type { NangoActionLocal as GetAttachmentNango } from '../actions/get-attachment.js';
import listAttachmentsAction from '../actions/list-attachments.js';
import type { NangoActionLocal as ListAttachmentsNango } from '../actions/list-attachments.js';
import listProjectsAction from '../actions/list-projects.js';
import type { NangoActionLocal as ListProjectsNango } from '../actions/list-projects.js';

class ActionErrorMock extends Error {
    payload: Record<string, unknown>;

    constructor(payload: Record<string, unknown>) {
        super(typeof payload['message'] === 'string' ? payload['message'] : 'action error');
        this.payload = payload;
    }
}

function makeNango(responseData: unknown): { post: ReturnType<typeof vi.fn>; ActionError: typeof ActionErrorMock } {
    return {
        post: vi.fn().mockResolvedValue({ data: responseData }),
        ActionError: ActionErrorMock
    };
}

// Linear's GraphQL API returns `email: null` for attachment creators that are
// bots, deleted users, or external users without an email on record.
describe('linear attachment null email regression', () => {
    it('get-attachment accepts a null creator email and omits it from the output', async () => {
        const nango = makeNango({
            data: {
                attachment: {
                    id: 'att-1',
                    title: 'PR #1',
                    url: 'https://example.com/pr/1',
                    metadata: {},
                    groupBySource: false,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    issue: { id: 'iss-1', identifier: 'ENG-1', title: 'Issue' },
                    creator: { id: 'user-1', name: 'Bot User', email: null },
                    externalUserCreator: { id: 'ext-1', name: 'External', email: null }
                }
            }
        });

        const response = await getAttachmentAction.exec(nango as unknown as GetAttachmentNango, { id: 'att-1' });

        expect(response.creator).toEqual({ id: 'user-1', name: 'Bot User' });
        expect(response.externalUserCreator).toEqual({ id: 'ext-1', name: 'External' });
    });

    it('list-attachments accepts a null creator email and omits it from the output', async () => {
        const nango = makeNango({
            data: {
                attachments: {
                    nodes: [
                        {
                            id: 'att-1',
                            createdAt: '2026-01-01T00:00:00.000Z',
                            updatedAt: '2026-01-01T00:00:00.000Z',
                            title: 'PR #1',
                            url: 'https://example.com/pr/1',
                            metadata: {},
                            groupBySource: false,
                            creator: { id: 'user-1', name: 'Bot User', email: null },
                            externalUserCreator: { id: 'ext-1', name: 'External', email: null },
                            issue: { id: 'iss-1', identifier: 'ENG-1', title: 'Issue' }
                        }
                    ],
                    pageInfo: { hasNextPage: false, endCursor: null }
                }
            }
        });

        const response = await listAttachmentsAction.exec(nango as unknown as ListAttachmentsNango, {});

        expect(response.items).toHaveLength(1);
        expect(response.items[0]?.creator).toEqual({ id: 'user-1', name: 'Bot User' });
        expect(response.items[0]?.externalUserCreator).toEqual({ id: 'ext-1', name: 'External' });
    });

    it('list-projects accepts a null lead email and omits it from the output', async () => {
        const nango = makeNango({
            data: {
                projects: {
                    nodes: [
                        {
                            id: 'proj-1',
                            name: 'Project',
                            description: null,
                            state: 'started',
                            progress: null,
                            startDate: null,
                            targetDate: null,
                            createdAt: null,
                            updatedAt: null,
                            url: null,
                            lead: { id: 'user-1', name: 'Bot Lead', email: null },
                            teams: null
                        }
                    ],
                    pageInfo: { hasNextPage: false, endCursor: null }
                }
            }
        });

        const response = await listProjectsAction.exec(nango as unknown as ListProjectsNango, {});

        expect(response.projects).toHaveLength(1);
        expect(response.projects[0]?.lead).toEqual({ id: 'user-1', name: 'Bot Lead' });
    });
});
