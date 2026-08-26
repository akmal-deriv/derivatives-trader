import fs from 'fs';
import path from 'path';

// Colour contract for the account header trigger. The header's balance already *asks* for the right
// colour: `<Text color='primary'>` writes an inline `--text-color` custom property
// (packages/components/src/components/text/text.tsx) that `.dc-text { color: var(--text-color) }`
// consumes — a (0,1,0) rule, so any two-class SCSS selector outranks it with no warning. That is
// specificity, and jsdom evaluates no cascade: it parses no stylesheets, so a `render()` assertion
// sees the requested colour and is blind to the rule defeating it. The contract is therefore
// asserted against the stylesheet text, the same way
// packages/trader/src/AppV2/Components/MarketTabs/__tests__/market-tabs-layout.spec.ts asserts a
// layout contract jsdom cannot see. Do not replace this with a computed-style assertion — that
// passes on the broken code.
// Comments are stripped so an assertion reads the declarations, not the prose about them.
const STYLESHEET_PATH = path.resolve(__dirname, '../../../../../sass/app/_common/components/account-switcher.scss');

const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const STYLESHEET = stripComments(fs.readFileSync(STYLESHEET_PATH, 'utf8'));

// The theme token definitions, so the balance's colour can be shown to be one that *inverts* with
// the theme rather than a brand colour that reads the same on both backgrounds. Generated from
// brand.config.json by `npm run generate:colors`, and committed.
const SEMANTIC_TOKENS = stripComments(
    fs.readFileSync(path.resolve(__dirname, '../../../../../../../shared/src/styles/tokens/semantic.scss'), 'utf8')
);

/** Every way this stylesheet's nesting can name the balance element. */
const BALANCE_SELECTORS = ['.acc-info__balance', '&__balance'];
/** Every way it can name an account-type state on the trigger. */
const ACCOUNT_TYPE_SELECTORS = ['&--is-demo', '&--is-virtual', '.acc-info--is-demo', '.acc-info--is-virtual'];

/** Bodies of every block `source` opens with `selector`, nested blocks included. Empty when `source`
 *  opens no such block — which is what "no rule targets this" looks like. The trailing space in the
 *  needle keeps `&__balance` from matching `&__balance-section`. */
const readBlocks = (source: string, selector: string): string[] => {
    const needle = `${selector} {`;
    const bodies: string[] = [];
    let start = source.indexOf(needle);

    while (start !== -1) {
        const open = start + needle.length - 1;
        let depth = 0;
        let end = -1;
        for (let i = open; i < source.length; i++) {
            if (source[i] === '{') depth += 1;
            else if (source[i] === '}') {
                depth -= 1;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end === -1) throw new Error(`Unbalanced braces after "${selector}"`);

        bodies.push(source.slice(open + 1, end));
        start = source.indexOf(needle, end);
    }

    return bodies;
};

/** The `color` declarations in `source`, verbatim, so a failure names the colour it found.
 *  `background-color` and friends are excluded by the leading boundary. */
const colorDeclarations = (source: string): string[] =>
    (source.match(/(?<![-\w])color:[^;{}]+/g) ?? []).map(declaration => declaration.trim());

const blocksTargeting = (source: string, selectors: string[]): string[] =>
    selectors.flatMap(selector => readBlocks(source, selector));

describe('account header text colours', () => {
    it('does not recolour the account balance for demo accounts', () => {
        // The bug: `&--is-demo { .acc-info__balance { color: var(--color-text-success) } }` resolves
        // to a (0,2,0) selector that beat the component's `color='primary'`, so a demo balance
        // rendered in the success green — a brand colour, identical in Light and Dark theme — while
        // the theme's primary text colour is the one that inverts with the theme.
        const from_account_type_blocks = blocksTargeting(STYLESHEET, ACCOUNT_TYPE_SELECTORS).flatMap(block =>
            blocksTargeting(block, BALANCE_SELECTORS).flatMap(colorDeclarations)
        );
        expect(from_account_type_blocks).toEqual([]);

        // And no rule recolours it unconditionally either, from the balance's own block.
        const from_balance_blocks = blocksTargeting(STYLESHEET, BALANCE_SELECTORS).flatMap(colorDeclarations);
        expect(from_balance_blocks).toEqual([]);
    });

    it('picks a token for the balance that inverts with the theme, unlike the one it replaces', () => {
        // A guard, not a red, and the automated half of the cross-theme check: the requirement is not
        // just "some colour" but the token that flips between Light and Dark. `--color-text-success`
        // resolves to the same brand green in both blocks, which is why the demo balance stayed green
        // on a dark background; `--color-text-primary` inverts, so the balance follows the theme.
        const light = readBlocks(SEMANTIC_TOKENS, '.theme--light')[0];
        const dark = readBlocks(SEMANTIC_TOKENS, '.theme--dark')[0];

        const valueOf = (block: string, token: string) => block.match(new RegExp(`${token}:\\s*([^;]+)`))?.[1].trim();

        expect(valueOf(light, '--color-text-primary')).not.toBe(valueOf(dark, '--color-text-primary'));
        expect(valueOf(light, '--color-text-success')).toBe(valueOf(dark, '--color-text-success'));
    });

    it('leaves the account-type label colour to the component, which codes it by account type', () => {
        // A guard, not a red: the demo/real colour coding of the `Demo account` / `Real account`
        // label is deliberate and lives in the component's `color` prop (`tertiary` for demo,
        // `secondary-alternate` for real). Hardcoding it here would defeat that prop the same way
        // the balance override did.
        const label_blocks = blocksTargeting(STYLESHEET, ['&__account-type-header', '.acc-info__account-type-header']);
        expect(label_blocks.length).toBeGreaterThan(0);
        expect(label_blocks.flatMap(colorDeclarations)).toEqual([]);
    });
});
