import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/merge-profiles.js';

describe('klaviyo merge-profiles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'merge-profiles',
        Model: 'ActionOutput_klaviyo_mergeprofiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
