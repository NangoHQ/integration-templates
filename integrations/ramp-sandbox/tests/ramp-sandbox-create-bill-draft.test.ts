import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-bill-draft.js';

describe('ramp-sandbox create-bill-draft tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-bill-draft',
        Model: 'ActionOutput_ramp_sandbox_createbilldraft'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
