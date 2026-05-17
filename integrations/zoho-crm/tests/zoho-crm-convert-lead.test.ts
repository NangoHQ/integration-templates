import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/convert-lead.js';

describe('zoho-crm convert-lead tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'convert-lead',
        Model: 'ActionOutput_zoho_crm_convertlead'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
