import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ticket-custom-field-values.js';

describe('gorgias list-ticket-custom-field-values tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ticket-custom-field-values',
        Model: 'ActionOutput_gorgias_listticketcustomfieldvalues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
