import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-leads-bulk.js';

describe('instantly delete-leads-bulk tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-leads-bulk',
        Model: 'ActionOutput_instantly_deleteleadsbulk'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
