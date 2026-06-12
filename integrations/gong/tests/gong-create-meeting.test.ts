import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-meeting.js';

class MockActionError extends Error {
    type: string;
    payload?: Record<string, unknown>;
    constructor(payload?: Record<string, unknown>) {
        super(payload?.message as string);
        this.type = payload?.type as string;
        this.payload = payload;
    }
}

describe('gong-oauth create-meeting tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-meeting',
        Model: 'ActionOutput_gong_oauth_createmeeting'
    });
    nangoMock.ActionError = MockActionError as unknown as typeof vi.fn;

    it('should throw an account configuration error for 409', async () => {
        const input = await nangoMock.getInput();
        try {
            await createAction.exec(nangoMock, input);
            expect.fail('Expected action to throw');
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null) {
                expect(err).toMatchObject({
                    type: 'account_configuration_error',
                    message: 'Provider disconnected'
                });
            } else {
                expect.fail('Expected error to be an object');
            }
        }
    });
});
