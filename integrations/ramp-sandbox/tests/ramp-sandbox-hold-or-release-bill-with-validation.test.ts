import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/hold-or-release-bill-with-validation.js';

describe('ramp-sandbox hold-or-release-bill-with-validation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'hold-or-release-bill-with-validation',
        Model: 'ActionOutput_ramp_sandbox_holdorreleasebillwithvalidation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
