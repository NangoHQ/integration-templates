import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-sms-reject.js';

describe('mandrill delete-sms-reject tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-sms-reject',
        Model: 'ActionOutput_mandrill_deletesmsreject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
