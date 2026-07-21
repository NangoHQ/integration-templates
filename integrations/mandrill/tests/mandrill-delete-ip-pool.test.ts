import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-ip-pool.js';

describe('mandrill delete-ip-pool tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-ip-pool',
        Model: 'ActionOutput_mandrill_deleteippool'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
