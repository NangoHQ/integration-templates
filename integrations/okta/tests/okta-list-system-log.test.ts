import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-system-log.js';

describe('okta list-system-log tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-system-log',
        Model: 'ActionOutput_okta_cc_listsystemlog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
