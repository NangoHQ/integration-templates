import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-tenants.js';

describe('xero get-tenants tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-tenants',
        Model: 'ActionOutput_xero_gettenants'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
