import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-revenue-types.js';

describe('pipelinecrm list-revenue-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-revenue-types',
        Model: 'ActionOutput_pipelinecrm_listrevenuetypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
