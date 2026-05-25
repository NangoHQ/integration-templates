import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-members.js';

describe('mailchimp list-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-members',
        Model: 'ActionOutput_mailchimp_listmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
