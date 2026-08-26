import path from 'path';

/**
 * TestData — centralised test data for the derivatives-trader Playwright suite.
 *
 * @example
 * ```typescript
 * import { TestData } from "../utils";
 *
 * await page.setInputFiles(input, TestData.document("Bank_statement.png"));
 * ```
 */
const TEST_DATA_ROOT = path.resolve(__dirname, '../test-data');

export const TestData = {
    document: (filename: string): string => path.join(TEST_DATA_ROOT, 'documents', filename),

    image: (filename: string): string => path.join(TEST_DATA_ROOT, 'images', filename),
};
