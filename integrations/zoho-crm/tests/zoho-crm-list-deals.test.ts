import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-deals.js';

describe('zoho-crm list-deals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-deals',
        Model: 'ActionOutput_zoho_crm_listdeals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
