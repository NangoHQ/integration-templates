import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-store.js';

describe('mailchimp update-store tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-store',
        Model: 'ActionOutput_mailchimp_updatestore'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
