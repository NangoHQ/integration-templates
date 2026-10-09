import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/acquire-attributes.js';

describe('exist acquire-attributes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'acquire-attributes',
        Model: 'ActionOutput_exist_acquireattributes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
