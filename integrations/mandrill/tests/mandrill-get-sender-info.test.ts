import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sender-info.js';

describe('mandrill get-sender-info tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-sender-info',
        Model: 'ActionOutput_mandrill_getsenderinfo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
