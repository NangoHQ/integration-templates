import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-deal.js';

describe('zoho-crm update-deal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-deal',
        Model: 'ActionOutput_zoho_crm_updatedeal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
