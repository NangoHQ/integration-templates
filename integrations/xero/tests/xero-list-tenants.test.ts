import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-tenants.js';

describe('xero list-tenants tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-tenants',
        Model: 'ActionOutput_xero_listtenants'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
