import fs from 'fs';
import path from 'path';

// Layout contract for the tab's trade-type row. jsdom does no layout, so the way a crowded desktop
// strip (>4 tabs) truncates that row lives in the stylesheet and is asserted here: the row is one
// text line, so the trade type keeps its width and the chevron cue + inline P/L trailing it are what
// run off the end. Laying the row out as a flex row instead squeezes the trade-type text down to a
// leading character or two while holding the cue and amount whole ("R… | +412.98 USD"), which is
// exactly the regression this guards.
// Comments are stripped so an assertion reads the declarations, not the prose about them (the rules
// below are explained in comments that quote the very properties being asserted).
const STYLESHEET = fs
    .readFileSync(path.resolve(__dirname, '../market-tabs.scss'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

/** The first block opened by `selector`, with its nested blocks (and their selectors) removed — so
 *  an assertion reads only the declarations that apply to `selector` itself. */
const readDeclarations = (selector: string) => {
    const start = STYLESHEET.indexOf(`${selector} {`);
    expect(start).toBeGreaterThanOrEqual(0);
    const open = STYLESHEET.indexOf('{', start);

    let depth = 0;
    let end = -1;
    for (let i = open; i < STYLESHEET.length; i++) {
        if (STYLESHEET[i] === '{') depth += 1;
        else if (STYLESHEET[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    if (end === -1) throw new Error(`Unbalanced braces after "${selector}" in market-tabs.scss`);

    let nesting = 0;
    return STYLESHEET.slice(open + 1, end)
        .split('\n')
        .filter(line => {
            const opens = (line.match(/{/g) ?? []).length;
            const closes = (line.match(/}/g) ?? []).length;
            const was_top_level = nesting === 0;
            nesting += opens - closes;
            return was_top_level && opens === 0;
        })
        .join('\n');
};

describe('market tab trade-type row layout', () => {
    it('truncates both label lines the same way, ellipsis included — the trade-type row is not exempt', () => {
        // One rule covers every line of the label, so the trade-type row ellipsises as one text
        // flow: the trade type reads first and keeps its width, the cue and amount after it are
        // dropped. Exempting the row is what let the text shrink to a leading character instead.
        const label_lines = readDeclarations('&__text > *');
        expect(label_lines).toMatch(/overflow:\s*hidden/);
        expect(label_lines).toMatch(/text-overflow:\s*ellipsis/);
        expect(label_lines).toMatch(/white-space:\s*nowrap/);
        expect(STYLESHEET).not.toMatch(/&__text\s*>\s*\*:not\(/);
    });

    it('lays the row out as a text line, not a flex row that would shrink the trade type', () => {
        // No `display: flex` on the row: its parts are inline boxes on one line, so `text-overflow`
        // above applies to them and the trade-type text is never the part that gives up width.
        const subtitle = readDeclarations('&__subtitle');
        expect(subtitle).not.toMatch(/display:\s*flex/);
        // No per-item shrink control either — that only exists for flex items, and reintroducing it
        // would mean the row had gone back to being a flex row.
        expect(subtitle).not.toMatch(/flex-shrink/);
        expect(readDeclarations('&__chevron')).not.toMatch(/flex-shrink/);
        expect(readDeclarations('&__profit')).not.toMatch(/flex-shrink/);
    });

    it('spaces the cue and the amount with margins, which vanish when they truncate away', () => {
        // A row `gap` would need the flex row this deliberately isn't; each part carries its own
        // leading margin instead, so a tab with no chevron or no P/L has no phantom space either.
        expect(readDeclarations('&__chevron')).toMatch(/margin-inline-start/);
        expect(readDeclarations('&__profit')).toMatch(/margin-inline-start/);
        // Both sit centred on the text rather than on its baseline, where an icon-only inline box
        // (the chevron) and a rule-led one (the P/L, whose divider leads it) would ride high.
        expect(readDeclarations('&__chevron')).toMatch(/vertical-align:\s*middle/);
        expect(readDeclarations('&__profit')).toMatch(/vertical-align:\s*middle/);
    });

    it('does not clip the tab itself, which would cut the active tab’s corner flares', () => {
        // The clip has to sit on the row: `.market-tab` paints its `:before`/`:after` fillets
        // outside its own box, so hiding its overflow would square off the active tab.
        expect(readDeclarations('.market-tab')).not.toMatch(/overflow:\s*hidden/);
    });
});
