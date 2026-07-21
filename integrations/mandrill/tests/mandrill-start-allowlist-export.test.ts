import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/start-allowlist-export.js';

describe('mandrill start-allowlist-export tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'start-allowlist-export',
        Model: 'ActionOutput_mandrill_startallowlistexport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
