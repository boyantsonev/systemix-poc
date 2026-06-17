---
description: Add PostHog instrumentation to a component. Reads the experiment contract for what to measure.
argument-hint: [component-name-or-path] [optional: event-name]
---

# /measure — Add Instrumentation

Instruments a component to capture the signals your hypothesis needs. Reads the experiment contract to understand what to track, proposes the capture calls, and writes only after approval.

## Usage
```
/measure HeroCTA
/measure src/components/HeroCTA.tsx button_click
```

## Steps

1. **Resolve the component** from $ARGUMENTS. If not found, ask the user.

2. **Read the experiment contract**: Check `design/decisions/` for a contract that references this component. Read the `posthog-event` and `metric` fields.

3. **Read the component**: Understand its structure, existing events, and interaction points.

4. **Propose instrumentation** based on the hypothesis metric:
   - CTR/click metrics → click handler on the primary action
   - Scroll depth → intersection observer
   - Conversion → form submission or route change

5. **Show the diff before writing**:
   ```tsx
   + import { usePostHog } from 'posthog-js/react';
   + const posthog = usePostHog();

   + posthog.capture('button_click', {
   +   variant: featureFlag ?? 'control',
   +   component: 'HeroCTA',
   + });
   ```

6. **HITL gate**: Ask for confirmation before writing.

7. **Update the contract frontmatter**:
   ```yaml
   posthog-instrumented: true
   posthog-event: [event-name]
   instrumented-at: [today]
   ```

8. **Report**: Files changed, event name, properties captured, contract updated.

## Notes
- Uses `posthog-js/react` (`usePostHog()` hook). Adapt to the project's PostHog setup.
- Always add a `variant` property so A/B results can be segmented in PostHog.
- The event name in the contract must match exactly what PostHog receives.
