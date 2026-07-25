import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-sms-reject.js';

describe('mandrill add-sms-reject tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-sms-reject',
        Model: 'ActionOutput_mandrill_addsmsreject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
