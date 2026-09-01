import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-ticket-custom-field-value.js';

describe('gorgias delete-ticket-custom-field-value tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-ticket-custom-field-value',
        Model: 'ActionOutput_gorgias_deleteticketcustomfieldvalue'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
