import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-ip-pool.js';

describe('mandrill create-ip-pool tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-ip-pool',
        Model: 'ActionOutput_mandrill_createippool'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
