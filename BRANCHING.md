## Git Branching Strategy

### Current Strategy

Today, there is only one degree of separation from master. New features are checked into a branches
defined by <first-initial><last-initial>-<feature-name-in-hyphens>. This standard has worked before 
as most features and contributors were small. However, now that the project is ramping up, this strategy
may have several limitations in that
- There is no 'develop' branch to store a set of features to be released at one time. Lacking a develop
branch will make integration testing among features much more difficult
- There are no release, hotfix, or bugfix branches. Same reasoning as above also applies here.

## Proposed Strategy

The proposal for future strategies is based on gitflow:

- a develop branch to house finished feature branches
- feature branches to be named feature/<name-in-hyphens>
- 