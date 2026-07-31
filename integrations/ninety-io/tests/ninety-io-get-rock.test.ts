import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-rock.js';

describe('ninety-io get-rock tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-rock',
        Model: 'ActionOutput_ninety_io_getrock'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
