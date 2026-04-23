---
name: figma-push
description: Screenshot a localhost (or any) URL and push the image onto a Figma canvas frame. Uses figma-console-mcp to place the image as a fill.
argument-hint: [localhost-url] [figma-url]
---

Push a screenshot of $ARGUMENTS onto a Figma canvas.

## Steps

1. **Parse arguments** from $ARGUMENTS:
   - First URL = source page to screenshot (e.g. `http://localhost:3000`)
   - Second URL = target Figma file/frame (e.g. `https://figma.com/design/...?node-id=...`)
   - If either is missing, ask the user before proceeding

2. **Parse the Figma URL**:
   - Extract `fileKey` from the URL path
   - Extract `nodeId` from `node-id` query param — convert `-` to `:`
   - If no `node-id`, you will create a new frame on the current page

3. **Screenshot the source URL**:
   - Use `mcp__claude_ai_Figma_Console__figma_capture_screenshot` if available
   - Otherwise use the `WebFetch` tool to load the page and describe what you see, then ask the user to provide a screenshot path

4. **Push to Figma**:
   - If a target `nodeId` was provided: use `mcp__claude_ai_Figma_Console__figma_set_image_fill` to set the image as a fill on that frame
   - If no nodeId: use `mcp__claude_ai_Figma_Console__figma_create_child` to create a new frame, then `figma_set_image_fill` on it
   - Set a meaningful name on the frame: the page title or URL hostname + timestamp

5. **Report**:
   - Figma file: [fileKey]
   - Frame: [node name] ([nodeId])
   - Image placed successfully / error details

## Notes
- Figma Desktop must be open with the target file for write operations via the desktop bridge
- The frame will be created at the top-left of the current page if no target node is specified
- For localhost URLs, the Figma Desktop bridge (port 3845) must be running
