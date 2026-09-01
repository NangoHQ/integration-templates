import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-customer-custom-field-values.js';

describe('gorgias update-customer-custom-field-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-customer-custom-field-values',
        Model: 'ActionOutput_gorgias_updatecustomercustomfieldvalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
