import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-note.js';

describe('zoho-crm create-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-note',
        Model: 'ActionOutput_zoho_crm_createnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
