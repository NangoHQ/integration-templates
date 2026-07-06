import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-segment.js';

describe('klaviyo delete-segment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-segment',
        Model: 'ActionOutput_klaviyo_deletesegment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
