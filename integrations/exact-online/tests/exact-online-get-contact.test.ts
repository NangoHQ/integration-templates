import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-contact.js';

describe('exact-online get-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-contact',
        Model: 'ActionOutput_exact_online_getcontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
