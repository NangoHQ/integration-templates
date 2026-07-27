import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ip-pool-info.js';

describe('mandrill get-ip-pool-info tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ip-pool-info',
        Model: 'ActionOutput_mandrill_getippoolinfo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
