import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-rfis.js';

describe('ingenious-build list-rfis tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-rfis',
        Model: 'ActionOutput_ingenious_build_listrfis'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
