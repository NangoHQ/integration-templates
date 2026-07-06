import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-requisition.js';

describe('lever-basic delete-requisition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-requisition',
        Model: 'ActionOutput_lever_basic_deleterequisition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
