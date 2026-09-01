import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-rules.js';

describe('gorgias list-rules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-rules',
        Model: 'ActionOutput_gorgias_listrules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
