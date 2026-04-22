import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workflow-states.js';

describe('linear list-workflow-states tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workflow-states',
        Model: 'ActionOutput_linear_listworkflowstates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
