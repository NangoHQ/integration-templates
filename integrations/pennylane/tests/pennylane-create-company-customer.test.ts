import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-company-customer.js';

describe('pennylane create-company-customer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-company-customer',
        Model: 'ActionOutput_pennylane_createcompanycustomer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
