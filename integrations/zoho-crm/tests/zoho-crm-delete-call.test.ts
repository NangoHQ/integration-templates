import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-call.js';

describe('zoho-crm delete-call tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-call',
        Model: 'ActionOutput_zoho_crm_deletecall'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
