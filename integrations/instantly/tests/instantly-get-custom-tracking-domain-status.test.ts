import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-custom-tracking-domain-status.js';

describe('instantly get-custom-tracking-domain-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-custom-tracking-domain-status',
        Model: 'ActionOutput_instantly_getcustomtrackingdomainstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
