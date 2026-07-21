import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-dedicated-ip.js';

describe('mandrill delete-dedicated-ip tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-dedicated-ip',
        Model: 'ActionOutput_mandrill_deletededicatedip'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
