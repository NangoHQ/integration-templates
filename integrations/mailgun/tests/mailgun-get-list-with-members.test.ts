import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-list-with-members.js';

describe('mailgun get-list-with-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-list-with-members',
        Model: 'ActionOutput_mailgun_getlistwithmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
