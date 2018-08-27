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
- feature branches (feature/)
- release branch (release/)
- hotfix branch (hotfix/)
- bugfix branch (bugfix/)
- support branch (support/)

The above allows for easier integration testing amongst new features, provides two degrees of
separation from master, and provides mechanisms for separation of concerns. Bugfix, hotfix, release,
and support branches all gather needed changes to production and makes it easy for 
any contributor to determine the nature of the production change.

## Use of gitflow

Though not necessary, gitflow provides a streamlined workflow for supporting the above differnt
branches and working with both the develop and master branches. Also, finishing a production release
will also provide tags which make versioning much easier.

A git flow cheatsheet can be found [here](https://danielkummer.github.io/git-flow-cheatsheet/).

### Setting up gitflow
Install gitflow via the [instructions](https://github.com/nvie/gitflow/wiki/Installation). Once that is done,
go into the directory you wish to use gitflow on and issue the command

```
git checkout -b develop
git flow init
```

The first command creates a new 'develop' branch, and the second prepares the directory to start using
git flow.

You will be faced with a series of prompts. You can accept the defaults for all of them.
