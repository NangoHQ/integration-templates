import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-company-customer.js';

describe('pennylane update-company-customer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-company-customer',
        Model: 'ActionOutput_pennylane_updatecompanycustomer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
