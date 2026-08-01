import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-booking-intent.js';

describe('youcanbook-me-public get-booking-intent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-booking-intent',
        Model: 'ActionOutput_youcanbook_me_public_getbookingintent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
