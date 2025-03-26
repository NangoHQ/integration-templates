import { describe, expect, it } from 'vitest';

import runAction from '../../quickbooks/actions/update-journal-entry.js';

describe('quickbooks-sandbox update-journal-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-journal-entry',
        Model: 'JournalEntry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
