
# Code.gov Tools - Unlocking the potential of the Federal Government’s software.

## Introduction

[Code.gov](https://code.gov) is a website promoting good practices in code development, collaboration, and reuse across the U.S.  Government. Code.gov will provide tools and guidance to help agencies implement the [Federal Source Code Policy](https://sourcecode.cio.gov). It will include an inventory of the government's custom code to promote reuse between agencies. And it will provide tools to help government and the public collaborate on open source projects.

This repository is home to the code powering code.gov. To learn more about the project, check out the main [Code.gov project README](https://github.com/presidential-innovation-fellows/code-gov-pm/blob/master/README.md)

## Installation
Please install the following dependencies before running this project...

* [Node.js](https://nodejs.org/en/download/)
* [Elasticsearch](https://www.elastic.co/downloads/elasticsearch)

Once node is installed, install the local npm dependencies...

`cd code-gov-api && npm install`

## Running
This project uses elasticsearch to store code repositories. As such, it is necessary to run an indexing process which will populate an elasticsearch index. Make sure that elasticsearch is running, then

`npm run index`

After the indexing process runs, you can fire up the server by running npm start...

`npm start`

The API should now be accessible via the browser (or curl) at [http://localhost:3001/api/0.1/](http://localhost:3001/api/0.1/).

## Contributing

Here’s how you can help contribute to code.gov:

* Source Code Policy
  * To provide feedback on the [Federal Source Code Policy](https://sourcecode.cio.gov/), you should follow [this issue tracker](https://github.com/WhiteHouse/source-code-policy/issues)

* Code.gov
    * To provide feedback on [the code.gov website], you should follow this [repository](https://github.com/presidential-innovation-fellows/code-gov-web) and [this issues tracker](https://github.com/presidential-innovation-fellows/code-gov-web/issues).
    * If you aren't sure where your question or idea fits, this is a good place to share it.

## Questions?

If you have questions, please feel [free to open an issue here](https://github.com/presidential-innovation-fellows/code-gov-web/issues): [https://github.com/presidential-innovation-fellows/code-gov-web/issues](https://github.com/presidential-innovation-fellows/code-gov-web/issues) or send us an email at code@listserv.gsa.gov.

## Public domain

As stated in [CONTRIBUTING](CONTRIBUTING.md):

> [..] this project is in the worldwide public domain (in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/)).

> All contributions to this project will be released under the CC0
dedication. By submitting a pull request, you are agreeing to comply
with this waiver of copyright interest.
