import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/list-shared-sites.js';

describe('sharepoint-online list-shared-sites tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-shared-sites',
        Model: 'SharepointSites'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
