# Developer Styleguide

## Overview
In order to preserve consistent code formatting and styling, [ESLint](http://eslint.org) rules have been defined
and are enforced through babel-eslint.

## Specific Rules
All rules are located in .eslintrc. The recommended eslint rules have been adopted. Further, the following have also
been specified (type of warning generated listed in parentheses):
- valid-jsdoc (warning)
- default-case (warning)
- no-empty-function (error)
- no-empty-expressions (error)
- no-param-reassign (error)
- global-require (error)
- brace-style of default (error)
- camelcase (warning)
- comma-dangle (error)
- indent of 2 (error)
- line-comment-position of above (error)
- max-len of 100 (error)
- no-multiple-empty-lines (error)
- semi (error)
- no-var (error)

To view code examples and full rule explanations, please visit [ESLint's rules page](http://eslint.org/docs/rules/). 

## Usage
To manually lint, run the command

`npm run lint`