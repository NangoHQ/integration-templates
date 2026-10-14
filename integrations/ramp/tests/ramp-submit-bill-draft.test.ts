import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/submit-bill-draft.js';

describe('ramp submit-bill-draft tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'submit-bill-draft',
        Model: 'ActionOutput_ramp_submitbilldraft'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
