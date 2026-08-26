import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-customer-data.js';

describe('gorgias set-customer-data tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-customer-data',
        Model: 'ActionOutput_gorgias_setcustomerdata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
