import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-flow-status.js';

describe('klaviyo update-flow-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-flow-status',
        Model: 'ActionOutput_klaviyo_updateflowstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
