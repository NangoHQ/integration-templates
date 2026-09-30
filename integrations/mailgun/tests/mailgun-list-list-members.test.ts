import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-list-members.js';

describe('mailgun list-list-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-list-members',
        Model: 'ActionOutput_mailgun_listlistmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
