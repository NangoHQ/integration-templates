import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ad-group-analytics.js';

describe('pinterest get-ad-group-analytics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ad-group-analytics',
        Model: 'ActionOutput_pinterest_getadgroupanalytics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
