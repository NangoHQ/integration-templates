import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/activate-project.js';

describe('zoho-invoice activate-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'activate-project',
        Model: 'ActionOutput_zoho_invoice_activateproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
