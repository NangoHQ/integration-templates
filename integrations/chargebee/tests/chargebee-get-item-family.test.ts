import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-item-family.js';

describe('chargebee get-item-family tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-item-family',
        Model: 'ActionOutput_chargebee_getitemfamily'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
