import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-or-create-vendor.js';

describe('ramp-sandbox find-or-create-vendor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-or-create-vendor',
        Model: 'ActionOutput_ramp_sandbox_findorcreatevendor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
