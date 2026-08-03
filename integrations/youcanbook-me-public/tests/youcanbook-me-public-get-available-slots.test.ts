import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-available-slots.js';

describe('youcanbook-me-public get-available-slots tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-available-slots',
        Model: 'ActionOutput_youcanbook_me_public_getavailableslots'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
