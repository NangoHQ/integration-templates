import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-member.js';

describe('mailchimp create-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-member',
        Model: 'ActionOutput_mailchimp_createmember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
