import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-entities';

describe('quickbooks query-entities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-entities',
        Model: 'ActionOutput_quickbooks_sandbox_queryentities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
