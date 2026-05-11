import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-quick-action-defaults.js';

describe('salesforce get-quick-action-defaults tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-quick-action-defaults',
        Model: 'ActionOutput_salesforce_getquickactiondefaults'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
