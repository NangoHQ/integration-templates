import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-item-family.js';

describe('chargebee create-item-family tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-item-family',
        Model: 'ActionOutput_chargebee_createitemfamily'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
