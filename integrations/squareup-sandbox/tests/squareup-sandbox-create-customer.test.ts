import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-customer.js';

describe('squareup-sandbox create-customer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-customer',
        Model: 'ActionOutput_squareup_sandbox_createcustomer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
