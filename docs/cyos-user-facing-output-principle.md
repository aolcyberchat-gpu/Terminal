# CyOS Command Result Reporting — User-Facing Output Principle

A command's output should describe the result in terms the CyOS user understands, not expose internal DOM structure or implementation details.

For example, a user sees one **Chat window**, not separate `chatwrap`, message-buffer, chatline, and userlist surfaces. The alpha command should therefore report one useful effective opacity for Chat. The implementation may calculate several underlying CSS values, but those details belong in internal state inspection/debugging, not ordinary Terminal output.

Keep two concerns separate:

- **Internal state model:** retain configured values, effective values, and layout overrides accurately.
- **User-facing reporter:** choose the single result that best represents what the user experiences, and label a meaningful context such as `(theater)` only when it changes the result.

This does not weaken the earlier reporting rule: commands report what actually happened, not merely what they were asked to do. It adds a presentation rule: report that truth at the abstraction level of the user's mental model.

Prefer concise output:
```text
chat        76% (theater)
video       100%
playlist    100%
```

Do not expose implementation terms like frame/titlebar, buffer/input, selectors, or DOM element IDs in normal command output. Such detail can be available in a dedicated diagnostic command if there is a real user need for it.

For remote/server actions, continue to distinguish request dispatch from confirmed completion. For local UI state, inspect the resulting effective state after applying the action.
