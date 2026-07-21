import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-subaccount.js';

describe('mandrill create-subaccount tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-subaccount',
        Model: 'ActionOutput_mandrill_createsubaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
