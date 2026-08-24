import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-webhook.js';

describe('cal-com-v2 create-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-webhook',
        Model: 'ActionOutput_cal_com_v2_createwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
