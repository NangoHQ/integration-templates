import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-vendor.js';

describe('ramp-sandbox delete-vendor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-vendor',
        Model: 'ActionOutput_ramp_sandbox_deletevendor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
