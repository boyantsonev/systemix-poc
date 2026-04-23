/**
 * get-file-data interceptor
 *
 * Downgrades unscoped `get_file_data` calls to `get_design_context` to avoid
 * pulling an entire Figma file into the context window when only a scoped node
 * read is needed.  This is the primary token-saving rule in the proxy.
 */

export interface InterceptResult {
  intercepted: true
  replacedWith: string
  reason: string
}

export interface PassthroughResult {
  intercepted: false
}

export type GetFileDataInterceptResult = InterceptResult | PassthroughResult

/**
 * Check whether the incoming tool call should be intercepted and rewritten.
 *
 * Rules:
 *  - Tool must be `get_file_data`
 *  - Args must NOT contain a non-empty `nodeId` (scoped calls are safe to
 *    forward as-is)
 */
export function interceptGetFileData(
  toolName: string,
  args: Record<string, unknown>,
): GetFileDataInterceptResult {
  if (toolName !== 'get_file_data') {
    return { intercepted: false }
  }

  const nodeId = args['nodeId']
  const hasNodeId = nodeId !== undefined && nodeId !== null && nodeId !== ''

  if (hasNodeId) {
    // Scoped call — safe to forward
    return { intercepted: false }
  }

  return {
    intercepted: true,
    replacedWith: 'get_design_context',
    reason: 'Unscoped get_file_data — downgraded to scoped call',
  }
}
