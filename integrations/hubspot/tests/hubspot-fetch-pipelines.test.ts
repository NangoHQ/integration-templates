import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/fetch-pipelines.js';

describe('hubspot fetch-pipelines tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'fetch-pipelines',
        Model: 'ActionOutput_hubspot_fetchpipelines'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
