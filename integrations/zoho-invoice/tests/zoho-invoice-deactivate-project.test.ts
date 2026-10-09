import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/deactivate-project.js';

describe('zoho-invoice deactivate-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'deactivate-project',
        Model: 'ActionOutput_zoho_invoice_deactivateproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
