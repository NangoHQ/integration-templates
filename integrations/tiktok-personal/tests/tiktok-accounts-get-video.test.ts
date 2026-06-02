import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-video.js';

describe('tiktok-accounts get-video tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-video',
        Model: 'ActionOutput_tiktok_accounts_getvideo'
    });

    it('should throw not_found when video does not exist', async () => {
        nangoMock.ActionError = class ActionError extends Error {
            constructor(public payload: Record<string, unknown>) {
                super(payload.message as string);
            }
        };

        const input = await nangoMock.getInput();
        await expect(createAction.exec(nangoMock, input)).rejects.toThrow('Video not found');
    });
});
