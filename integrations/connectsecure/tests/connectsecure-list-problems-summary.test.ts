import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-problems-summary.js';

describe('connectsecure list-problems-summary tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-problems-summary',
        Model: 'ActionOutput_connectsecure_listproblemssummary'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
