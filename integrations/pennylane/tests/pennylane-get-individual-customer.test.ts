import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-individual-customer.js';

describe('pennylane get-individual-customer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-individual-customer',
        Model: 'ActionOutput_pennylane_getindividualcustomer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
