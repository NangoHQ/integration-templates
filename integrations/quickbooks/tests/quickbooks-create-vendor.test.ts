import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-vendor.js';

describe('quickbooks create-vendor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-vendor',
        Model: 'ActionOutput_quickbooks_sandbox_createvendor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
