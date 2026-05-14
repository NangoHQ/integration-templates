import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-call.js';

describe('zoho-crm create-call tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-call',
        Model: 'ActionOutput_zoho_crm_createcall'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
