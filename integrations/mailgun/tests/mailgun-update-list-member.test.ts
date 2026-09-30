import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-list-member.js';

describe('mailgun update-list-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-list-member',
        Model: 'ActionOutput_mailgun_updatelistmember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
