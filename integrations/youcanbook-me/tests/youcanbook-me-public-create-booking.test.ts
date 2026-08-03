import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-booking.js';

describe('youcanbook-me-public create-booking tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-booking',
        Model: 'ActionOutput_youcanbook_me_public_createbooking'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
