import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-profiles.js';

describe('mixpanel query-profiles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-profiles',
        Model: 'ActionOutput_mixpanel_queryprofiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
