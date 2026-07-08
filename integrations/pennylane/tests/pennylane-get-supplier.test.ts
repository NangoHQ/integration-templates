import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-supplier.js';

describe('pennylane get-supplier tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-supplier',
        Model: 'ActionOutput_pennylane_getsupplier'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
