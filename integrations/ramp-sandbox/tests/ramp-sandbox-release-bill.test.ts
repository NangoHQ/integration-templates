import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/release-bill.js';

describe('ramp-sandbox release-bill tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'release-bill',
        Model: 'ActionOutput_ramp_sandbox_releasebill'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
