# KeeperHub Builder Feedback

## Integration Experience

### What worked well
- Direct Execution API is clean and well-documented
- The contract-call endpoint handles ABI detection automatically
- Synchronous execution model is simple to integrate
- API key auth is straightforward

### UX/UI Friction
- No testnet/sandbox mode clearly documented for hackathon builders
- Unclear which networks support Base Sepolia for testing

### Documentation Gaps
- Would benefit from Python SDK examples (docs focus on curl/JS)
- check-and-execute endpoint needs more real-world examples
- Spending caps documentation could include default values

### Feature Requests
- Python SDK would reduce integration time significantly
- WebSocket support for execution status instead of polling
- Batch execution endpoint for multiple transactions
- CrewAI plugin for direct KeeperHub tool integration

### Bug Reports
- None encountered during integration

## How KeeperHub Was Used
Deliberate uses KeeperHub as the execution layer after AI agents
reach consensus. When the committee chair (James) issues a verdict,
KeeperHub's Direct Execution API handles the onchain transaction
with retry logic and gas optimization. This bridges AI reasoning
with guaranteed onchain execution.

## Team
Ashiha Mahesh Kumar — @ashihams
