import { describe, expect, it, vi } from 'vitest';

import getTranscriptAction from '../actions/get-transcript.js';
import type { NangoActionLocal as GetTranscriptNango } from '../actions/get-transcript.js';
import listTranscriptsAction from '../actions/list-transcripts.js';
import type { NangoActionLocal as ListTranscriptsNango } from '../actions/list-transcripts.js';

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

// Fireflies returns `summary.action_items` either as an array of strings or as
// a single newline-joined string depending on the account/summary version.
describe('fireflies action_items shape regression', () => {
    it('list-transcripts normalizes a string action_items payload to an array', async () => {
        const nango = makeNango({
            data: {
                transcripts: [
                    {
                        id: 't-1',
                        title: 'Weekly sync',
                        summary: {
                            action_items: '**Alice**\nFollow up on budget\n**Bob**\nShip the fix\n'
                        }
                    }
                ]
            }
        });

        const response = await listTranscriptsAction.exec(nango as unknown as ListTranscriptsNango, {});

        expect(response.transcripts[0]?.summary?.action_items).toEqual(['**Alice**', 'Follow up on budget', '**Bob**', 'Ship the fix']);
    });

    it('list-transcripts keeps an array action_items payload as-is', async () => {
        const nango = makeNango({
            data: {
                transcripts: [
                    {
                        id: 't-1',
                        summary: {
                            action_items: ['Follow up on budget', 'Ship the fix']
                        }
                    }
                ]
            }
        });

        const response = await listTranscriptsAction.exec(nango as unknown as ListTranscriptsNango, {});

        expect(response.transcripts[0]?.summary?.action_items).toEqual(['Follow up on budget', 'Ship the fix']);
    });

    it('get-transcript normalizes an array action_items payload to a newline-joined string', async () => {
        const nango = makeNango({
            data: {
                transcript: {
                    id: 't-1',
                    title: 'Weekly sync',
                    summary: {
                        overview: 'Overview',
                        action_items: ['Follow up on budget', 'Ship the fix']
                    }
                }
            }
        });

        const response = await getTranscriptAction.exec(nango as unknown as GetTranscriptNango, { id: 't-1' });

        expect(response.summary?.action_items).toBe('Follow up on budget\nShip the fix');
        expect(response.summary?.overview).toBe('Overview');
    });

    it('get-transcript keeps a string action_items payload as-is', async () => {
        const nango = makeNango({
            data: {
                transcript: {
                    id: 't-1',
                    summary: {
                        action_items: 'Follow up on budget\nShip the fix'
                    }
                }
            }
        });

        const response = await getTranscriptAction.exec(nango as unknown as GetTranscriptNango, { id: 't-1' });

        expect(response.summary?.action_items).toBe('Follow up on budget\nShip the fix');
    });
});
