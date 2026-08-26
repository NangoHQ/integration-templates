import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-update-custom-fields.js';

describe('gorgias bulk-update-custom-fields tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bulk-update-custom-fields',
        Model: 'ActionOutput_gorgias_bulkupdatecustomfields'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
