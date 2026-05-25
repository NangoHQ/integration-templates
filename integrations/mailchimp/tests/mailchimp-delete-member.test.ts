import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-member.js';

describe('mailchimp delete-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-member',
        Model: 'ActionOutput_mailchimp_deletemember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
