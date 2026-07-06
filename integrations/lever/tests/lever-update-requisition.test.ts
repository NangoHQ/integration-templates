import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-requisition.js';

describe('lever-basic update-requisition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-requisition',
        Model: 'ActionOutput_lever_basic_updaterequisition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
