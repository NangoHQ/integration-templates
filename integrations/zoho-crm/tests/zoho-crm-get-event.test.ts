import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-event.js';

describe('zoho-crm get-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-event',
        Model: 'ActionOutput_zoho_crm_getevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
