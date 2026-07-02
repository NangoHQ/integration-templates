import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-opportunities-deleted.js';

describe('lever-basic get-opportunities-deleted tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-opportunities-deleted',
        Model: 'ActionOutput_lever_basic_getopportunitiesdeleted'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
