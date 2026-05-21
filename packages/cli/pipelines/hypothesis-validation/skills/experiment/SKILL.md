---
description: Wire a PostHog feature flag into a component to serve A/B variants.
argument-hint: [experiment-name] [optional: component-name]
---

# /experiment — Set Up A/B Test

Wires a PostHog feature flag into a component to serve the experiment variant. Updates the contract with the experiment configuration.

## Usage
```
/experiment hero-cta
/experiment hero-cta HeroCTA
```

## Steps

1. **Read the experiment contract** from `contract/experiments/[name].mdx`.

2. **Confirm the variants**: Show the variants from the contract. Ask if any changes before proceeding.

3. **Generate the feature flag usage**:
   ```tsx
   const flags = useFeatureFlagPayload('[experiment-name]');
   const variant = flags?.variant ?? 'control';
   ```

4. **Wire the variant into the component**:
   ```tsx
   {variant === 'variant-b' ? (
     <Button>Start the loop</Button>
   ) : (
     <Button>Get started</Button>
   )}
   ```

5. **Show the PostHog flag definition to create in the PostHog dashboard**:
   - Flag key: `[experiment-name]`
   - Rollout: 50% / 50%
   - Variants: control, variant-b

6. **HITL gate**: Show all proposed changes before writing.

7. **Update the contract**:
   ```yaml
   posthog-flag: [experiment-name]
   experiment-started: [today]
   status: running
   ```

8. **Report**: Component updated, flag key to create in PostHog, contract status → `running`.

## Notes
- You must create the feature flag in PostHog manually — Systemix reads results but does not manage flag creation.
- Once the flag is live, run `/evidence [name]` to start pulling results.
- The flag key must match the contract slug exactly.
