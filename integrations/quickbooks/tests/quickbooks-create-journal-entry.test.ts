import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-journal-entry.js';

describe('quickbooks create-journal-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-journal-entry',
        Model: 'ActionOutput_quickbooks_sandbox_createjournalentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
