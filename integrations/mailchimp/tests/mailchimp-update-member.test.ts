import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-member.js';

describe('mailchimp update-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-member',
        Model: 'ActionOutput_mailchimp_updatemember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
