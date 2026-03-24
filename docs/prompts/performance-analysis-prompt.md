# Performance Analysis Prompt

Use this prompt to conduct a comprehensive performance analysis of the derivatives trading platform.

---

## Context

This is a derivatives trading platform built with:

- **React 17** with TypeScript
- **MobX 6** for state management
- **Webpack 5** monorepo with 9 packages
- **WebSocket API** with React Query for data fetching
- **Real-time trading** with chart integration

## Instructions

Conduct a performance analysis of the trading application frontend by following these steps:

### 1. Review Architecture

- Read `CLAUDE.md` for complete architecture understanding
- Focus on the monorepo structure, MobX stores, and WebSocket integration
- Understand the code splitting strategy between packages

### 2. Analyze Critical Areas

#### A. Bundle Size & Code Splitting

- Run `npm run analyze:bundle` to generate bundle reports
- Review bundle-report.html files in each package directory
- Identify:
    - Duplicate dependencies across packages
    - Oversized vendor chunks
    - Lazy loading opportunities for heavy libraries (charts, ace editor)
    - Unused dependencies that can be removed
    - Webpack configuration improvements

#### B. React Rendering Performance

Examine these specific areas:

- **TradeStore** (`packages/trader/src/Stores/Modules/Trading/trade-store.ts`) - 103KB file, main trading state
- **Trading Form Components** (`packages/trader/src/Modules/Trading/Components/Form/`)
- Check for:
    - Missing `observer()` HOCs causing unnecessary re-renders
    - Expensive computed properties in MobX stores
    - Large component trees without React.memo or useMemo
    - Components re-rendering on unrelated store changes
    - Over-use of `useEffect` hooks with missing dependencies

#### C. MobX State Management

- Review store patterns in `packages/core/src/Stores/`
- Check for:
    - Actions modifying too much state at once
    - Computed properties with expensive calculations
    - Stores not using `makeObservable()` correctly
    - Missing `@computed` decorators for derived data
    - Over-persistence to localStorage (BaseStore pattern)

#### D. API & WebSocket Performance

- Review `packages/api/src/APIProvider.tsx`
- Analyze:
    - Subscription deduplication effectiveness
    - WebSocket reconnection logic (30s keep-alive)
    - React Query cache configuration
    - Unnecessary API calls or subscriptions
    - Missing query invalidation causing stale data
    - Proposal polling frequency in TradeStore

#### E. Chart & UI Performance

- Review SmartChart integration in trader package
- Check:
    - Chart barrier updates triggering re-renders
    - Real-time tick subscriptions
    - Canvas rendering performance
    - Responsive component loading (screen-large vs screen-small)

#### F. Assets & Resources

- Analyze static assets in packages
- Check:
    - Unoptimized images or SVGs
    - Font loading strategy
    - CSS bundle size from SCSS files
    - Unused icon imports from @deriv/quill-icons

### 3. Specific Files to Review

Priority files for performance analysis:

```
packages/trader/src/Stores/Modules/Trading/trade-store.ts
packages/api/src/APIProvider.tsx
packages/api/src/useSubscription.ts
packages/core/src/App/initStore.js
packages/trader/src/Modules/Trading/Components/Form/
packages/core/build/webpack.config.js
packages/trader/build/webpack.config.js
packages/components/src/components/
```

### 4. Performance Testing

Run these commands to gather metrics:

```bash
# Generate bundle analysis
npm run analyze:bundle

# Run tests to ensure no regressions
npm run test:jest

# Start dev server and use Chrome DevTools:
npm run serve --workspace=@deriv/core
# - Performance tab: record user interactions
# - React DevTools Profiler: identify slow renders
# - Network tab: analyze API call patterns
```

### 5. Deliverables

Provide a structured report with:

#### Executive Summary

- Top 3-5 performance issues
- Estimated impact of each (High/Medium/Low)
- Quick wins vs long-term improvements

#### Detailed Findings

For each issue found, document:

- **Location**: File path and line numbers
- **Issue**: What's causing the performance problem
- **Impact**: How it affects user experience
- **Recommendation**: Specific code changes needed
- **Example**: Show before/after code if applicable

#### Bundle Size Analysis

- Current bundle sizes for each package
- Largest dependencies identified
- Recommendations for reduction
- Target bundle sizes

#### Rendering Performance

- Components with excessive re-renders
- MobX stores with performance issues
- Missing optimizations (memo, computed, etc.)
- Recommended refactorings

#### API & Data Flow

- WebSocket subscription patterns
- React Query cache issues
- Unnecessary network requests
- Optimization strategies

#### Implementation Priority

Categorize recommendations:

1. **Critical** - Immediate performance impact
2. **High** - Significant improvement, moderate effort
3. **Medium** - Noticeable improvement, higher effort
4. **Low** - Minor improvement or future consideration

## Output Format

Structure your response as:

```markdown
# Performance Analysis Report

Date: [Current Date]

## Executive Summary

[3-5 bullet points with top issues]

## Bundle Size Analysis

### Current State

- @deriv/core: XXX KB
- @deriv/trader: XXX KB
- @deriv/reports: XXX KB
- Total: XXX KB

### Issues Found

1. [Issue with file references]
2. [Issue with file references]

### Recommendations

1. [Action item with priority]
2. [Action item with priority]

## React Rendering Performance

### Issues Found

[List with file:line references]

### Recommendations

[Specific code changes]

## MobX State Management

### Issues Found

[List with store references]

### Recommendations

[Specific patterns to implement]

## API & WebSocket Performance

### Issues Found

[List with specific subscription patterns]

### Recommendations

[Optimization strategies]

## Implementation Roadmap

### Phase 1 (Critical - Week 1)

- [ ] Item 1 [file:line]
- [ ] Item 2 [file:line]

### Phase 2 (High - Week 2-3)

- [ ] Item 1 [file:line]
- [ ] Item 2 [file:line]

### Phase 3 (Medium - Month 2)

- [ ] Item 1 [file:line]

### Phase 4 (Low - Backlog)

- [ ] Item 1 [file:line]

## Estimated Impact

Total bundle size reduction: XXX KB → XXX KB (-XX%)
Estimated performance improvement: XX% faster load time
```

**IMPORTANT**: Document under docs folder

## Notes

- Use browser DevTools and React DevTools Profiler for real measurements
- Focus on user-facing performance (TTI, FCP, LCP metrics)
- Consider mobile performance separately from desktop
- Test with production builds, not just development mode
- Look for memory leaks in long-running sessions
- Check for performance regressions after DataDog integration

## Success Metrics

Define success as:

- Bundle size reduction > 20%
- Initial load time < 3 seconds
- Time to Interactive < 5 seconds
- No component renders taking > 16ms
- WebSocket reconnection < 2 seconds
- Chart updates at 60fps
