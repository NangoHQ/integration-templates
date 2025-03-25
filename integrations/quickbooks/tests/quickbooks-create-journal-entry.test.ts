import { describe, expect, it } from 'vitest';

import runAction from '../../quickbooks/actions/create-journal-entry.js';

describe('quickbooks-sandbox create-journal-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-journal-entry',
        Model: 'JournalEntry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
