import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-segment.js';

describe('klaviyo get-segment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-segment',
        Model: 'ActionOutput_klaviyo_getsegment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
