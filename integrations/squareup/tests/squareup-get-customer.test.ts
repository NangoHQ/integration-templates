import { expect, it, describe } from 'vitest';

import createAction from '../actions/get-customer.js';

describe('squareup get-customer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-customer',
        Model: 'ActionOutput_squareup_getcustomer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
