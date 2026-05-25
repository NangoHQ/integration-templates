import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-store.js';

describe('mailchimp get-store tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-store',
        Model: 'ActionOutput_mailchimp_getstore'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
