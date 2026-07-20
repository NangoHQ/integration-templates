import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-customer.js';

describe('squareup update-customer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-customer',
        Model: 'ActionOutput_squareup_updatecustomer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
