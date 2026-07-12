import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pro-account-mandates.js';

describe('pennylane list-pro-account-mandates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pro-account-mandates',
        Model: 'ActionOutput_pennylane_listproaccountmandates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
