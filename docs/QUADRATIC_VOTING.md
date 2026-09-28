# Quadratic Voting — Design Decision and Trade-offs

## Overview

This document explains the rationale for implementing quadratic voting (QV) in the Rave hackathon platform, the threat model it addresses, and the trade-offs involved.

## Threat Addressed: Vote Concentration / Loud Minority Problem

In a standard one-person-one-vote system, a small but highly motivated group can disproportionately influence outcomes by:
- Coordinating votes across multiple accounts (Sybil attacks)
- Mobilizing a dedicated minority to outvote a larger but less engaged majority
- Creating the appearance of broad consensus when only a few people care intensely

Quadratic voting mitigates this by making the **marginal cost of additional votes increase**. Under QV:
- 1 vote costs 1 unit of influence → √1 = 1.0 influence
- 4 votes cost 4 units of influence → √4 = 2.0 influence
- 9 votes cost 9 units of influence → √9 = 3.0 influence
- 16 votes cost 16 units of influence → √16 = 4.0 influence

A single user casting 9 votes only has 3× the influence of a user casting 1 vote, not 9×.

## Implementation Details

### Storage
- **Raw votes are stored as-is**: Each vote record represents one user's support for one submission
- **No derived columns**: Influence (√n) is computed at read time only
- **Vote table unchanged**: The existing `vote` table with unique constraint on `(voterId, submissionId)` remains the source of truth

### Computation
- **Vote counts**: Aggregated via `COUNT(*)` grouped by `submissionId`
- **Influence**: Computed as `Math.sqrt(voteCount)` at query/read time
- **API response**: Both `votes` (raw count) and `influence` (√votes) are returned

### Frontend Display
- Ballot defaults to sorting by "Influence (√votes)"
- Users can toggle between raw votes and influence sorting
- Vote cards show both metrics for transparency

## Trade-offs and Costs

### ❌ Suppresses Genuine Enthusiasm
A user who genuinely loves multiple projects and wants to support all of them is penalized. Their 3rd vote only adds ~0.32 influence (√3 - √2 ≈ 0.32), making it feel like their additional support "doesn't count as much."

**Mitigation**: The max votes per user (default 3) limits this effect. Users can still support up to 3 projects, with diminishing but non-zero returns.

### ❌ Harder to Explain Than One-Person-One-Vote
"Your influence is the square root of your vote count" is less intuitive than "each vote counts equally." This creates a communication burden.

**Mitigation**: The UI shows both raw votes and influence side-by-side with clear labels. The "How Voting Works" section explains the quadratic formula.

### ❌ Changes the Meaning of Raw Vote Counts
A project with 100 votes has 10× the influence of a project with 1 vote (not 100×). Raw vote counts no longer directly represent "popularity" in the traditional sense.

**Mitigation**: Both metrics are displayed. Organizers and participants can choose which lens to view results through.

### ❌ Introduces Additional Conceptual Complexity
The system now has two ranking mechanisms (raw votes vs. influence) which can create confusion about "which one is the real result?"

**Mitigation**: Default to influence sorting on the ballot. Document clearly that influence is the official ranking metric for community voting.

### ❌ Does Not Prevent Sybil Attacks Alone
A determined attacker with 100 fake accounts can still cast 100 votes (100 influence). QV only reduces the impact of *concentrated* votes from the *same* identity.

**Mitigation**: Combined with email-gated voting (`votingMode: "gated"`) and authentication requirements, Sybil resistance is layered.

## Why Quadratic Voting Over Alternatives

| Scheme | Pros | Cons |
|--------|------|------|
| **One-person-one-vote** | Simple, intuitive | Vulnerable to vote concentration; no protection for minority interests |
| **Quadratic voting (√n)** | Reduces concentration; allows intensity expression | More complex; suppresses enthusiasm |
| **Ranked choice / Borda** | Captures preferences | Complex tally; strategic voting incentives |
| **Approval voting** | Simple; no ranking needed | No intensity expression; all-or-nothing |

**Decision**: Quadratic voting was chosen because:
1. It directly addresses the stated threat (loud minority / vote concentration)
2. It allows voters to express intensity of preference (not just binary support)
3. It has theoretical grounding in mechanism design (Glen Weyl, E. Glen Weyl & Eric Posner)
4. It's computable at read time with no schema changes

## Configuration

The quadratic voting model is currently **always active** for community voting. There is no toggle to disable it because:
- Raw votes are always available for transparency
- The UI allows sorting by either metric
- Organizers can choose which metric to emphasize in announcements

If a future event prefers pure one-person-one-vote, they can:
1. Set `maxVotesPerUser: 1` (effectively making √1 = 1 for all)
2. Communicate that only raw votes matter for their event

## Future Considerations

- **Credit-based QV**: Give users a budget of "voice credits" to allocate across projects (more flexible but more complex)
- **Pairwise quadratic voting**: Apply QV to pairwise comparisons for Condorcet-style aggregation
- **Dynamic vote limits**: Adjust `maxVotesPerUser` based on event size or phase

## References

- Weyl, E. G., & Posner, E. A. (2018). *Radical Markets: Uprooting Capitalism and Democracy for a Just Society*. Chapter 2: Quadratic Voting.
- Lalley, S., & Weyl, E. G. (2018). "Quadratic Voting: How Mechanism Design Can Radicalize Democracy." *AEA Papers and Proceedings*, 108, 33-37.