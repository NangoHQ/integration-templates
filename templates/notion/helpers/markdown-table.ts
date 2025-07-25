import { defaultStringLength, serialize, toAlignment } from '../utils.js';

// Source: https://github.com/wooorm/markdown-table
export const markdownTable = (table: any, options: any = {}) => {
    const align = (options.align || []).concat();
    const stringLength = options.stringLength || defaultStringLength;
    const alignments = [];
    const cellMatrix = [];
    const sizeMatrix = [];
    const longestCellByColumn = [];
    let mostCellsPerRow = 0;
    let rowIndex = -1;

    while (++rowIndex < table.length) {
        const row = [];
        const sizes = [];
        let columnIndex = -1;

        if (table[rowIndex].length > mostCellsPerRow) {
            mostCellsPerRow = table[rowIndex].length;
        }

        while (++columnIndex < table[rowIndex].length) {
            const cell = serialize(table[rowIndex][columnIndex]);

            if (options.alignDelimiters !== false) {
                const size = stringLength(cell);
                sizes[columnIndex] = size;

                if (longestCellByColumn[columnIndex] === undefined || size > longestCellByColumn[columnIndex]) {
                    longestCellByColumn[columnIndex] = size;
                }
            }

            row.push(cell);
        }

        cellMatrix[rowIndex] = row;
        sizeMatrix[rowIndex] = sizes;
    }

    let columnIndex = -1;

    if (typeof align === 'object' && 'length' in align) {
        while (++columnIndex < mostCellsPerRow) {
            alignments[columnIndex] = toAlignment(align[columnIndex]);
        }
    } else {
        const code = toAlignment(align);

        while (++columnIndex < mostCellsPerRow) {
            alignments[columnIndex] = code;
        }
    }

    columnIndex = -1;
    const row = [];
    const sizes = [];

    while (++columnIndex < mostCellsPerRow) {
        const code = alignments[columnIndex];
        let before = '';
        let after = '';

        if (code === 99 /* `c` */) {
            before = ':';
            after = ':';
        } else if (code === 108 /* `l` */) {
            before = ':';
        } else if (code === 114 /* `r` */) {
            after = ':';
        }

        let size: number = options.alignDelimiters === false ? 1 : Math.max(1, longestCellByColumn[columnIndex] - before.length - after.length);

        const cell = before + '-'.repeat(size) + after;

        if (options.alignDelimiters !== false) {
            size = before.length + size + after.length;

            if (size > longestCellByColumn[columnIndex]) {
                longestCellByColumn[columnIndex] = size;
            }

            sizes[columnIndex] = size;
        }

        row[columnIndex] = cell;
    }

    cellMatrix.splice(1, 0, row);
    sizeMatrix.splice(1, 0, sizes);

    rowIndex = -1;
    const lines = [];

    while (++rowIndex < cellMatrix.length) {
        const row = cellMatrix[rowIndex];
        const sizes = sizeMatrix[rowIndex];
        columnIndex = -1;
        const line = [];

        while (++columnIndex < mostCellsPerRow) {
            const cell = row?.[columnIndex] || '';
            let before = '';
            let after = '';

            if (options.alignDelimiters !== false) {
                const size = longestCellByColumn[columnIndex] - (sizes?.[columnIndex] || 0);
                const code = alignments[columnIndex];

                if (code === 114 /* `r` */) {
                    before = ' '.repeat(size);
                } else if (code === 99 /* `c` */) {
                    if (size % 2) {
                        before = ' '.repeat(size / 2 + 0.5);
                        after = ' '.repeat(size / 2 - 0.5);
                    } else {
                        before = ' '.repeat(size / 2);
                        after = before;
                    }
                } else {
                    after = ' '.repeat(size);
                }
            }

            if (options.delimiterStart !== false && !columnIndex) {
                line.push('|');
            }

            if (options.padding !== false && !(options.alignDelimiters === false && cell === '') && (options.delimiterStart !== false || columnIndex)) {
                line.push(' ');
            }

            if (options.alignDelimiters !== false) {
                line.push(before);
            }

            line.push(cell);

            if (options.alignDelimiters !== false) {
                line.push(after);
            }

            if (options.padding !== false) {
                line.push(' ');
            }

            if (options.delimiterEnd !== false || columnIndex !== mostCellsPerRow - 1) {
                line.push('|');
            }
        }

        lines.push(options.delimiterEnd === false ? line.join('').replace(/ +$/, '') : line.join(''));
    }

    return lines.join('\n');
};
