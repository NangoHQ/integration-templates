import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-import-profiles.js';

describe('klaviyo bulk-import-profiles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bulk-import-profiles',
        Model: 'ActionOutput_klaviyo_bulkimportprofiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
