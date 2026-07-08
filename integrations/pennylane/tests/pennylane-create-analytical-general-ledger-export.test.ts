import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-analytical-general-ledger-export.js';

describe('pennylane create-analytical-general-ledger-export tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-analytical-general-ledger-export',
        Model: 'ActionOutput_pennylane_createanalyticalgeneralledgerexport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
