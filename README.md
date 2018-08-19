# Code.gov Tools - Unlocking the potential of the Federal Government’s software

[![CircleCI](https://circleci.com/gh/GSA/code-gov-api.svg?style=shield&circle-token=a7551669b06edee93c482a338d87d354974faa9f)](https://circleci.com/gh/GSA/code-gov-api)
[![Maintainability](https://api.codeclimate.com/v1/badges/c7f588c467b66045efdf/maintainability)](https://codeclimate.com/github/GSA/code-gov-api/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/c7f588c467b66045efdf/test_coverage)](https://codeclimate.com/github/GSA/code-gov-api/test_coverage)
[![Issue Count](https://codeclimate.com/github/GSA/code-gov-api/badges/issue_count.svg)](https://codeclimate.com/github/GSA/code-gov-api)

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

## Docker

For more detailed documentation on Docker and its components please visit their [documentation site](https://docs.docker.com/).

### Build

To run a container you first have to build an image. To do so you can execute `$> docker build -t <name_and_tag_for_your_image> .`. You can execute `$> docker images` to verify that it was created.

For us, `Code.gov`, the command would be:

```bash
$> docker build -t codegov/code-gov-api .
```

![docker-build](https://media.giphy.com/media/1rM5KOD27FiHrcDhQd/giphy.gif)

### Run a container

To create and run a container execute:

```bash
docker run -p 3001:3001 codegov/code-gov-api
```

If you want the container to run in the background (detached) pass the `-d` flag to the `docker run` command.

Eg:

```bash
docker run -d -p 3001:3001 codegov/code-gov-api
```

To attach the project's source directory to the containers volume execute `docker run -d -p 3001:3001 -v <path_to_project>:/usr/src/app codegov/code-gov-api`

Eg.

```bash
docker run -d -p 3001:3001 -v /home/user/code-gov-api:/usr/src/app codegov/code-gov-api
```

For more information on how to use Docker volumes take a look at:

* [Dockerfile](https://docs.docker.com/engine/reference/builder/#volume)
* [Docker compose](https://docs.docker.com/compose/compose-file/#volumes)

#### Container Env

The code-gov-api container accepts a number of environment variable that you can set:

* NEW_RELIC_KEY - Your New Relic key. You will need a New Relic account to get one. For more inforamation visit the [New Relic docs](https://docs.newrelic.com/docs/accounts/install-new-relic/account-setup/license-key).
* GITHUB_API_KEY - Your Github key. You will need to have a Github accout, get one.
  * [Click here](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/) For information on how to get a personal access token
* ES_HOST: Elasticsearch host. Default: localhost
* ES_PORT: Elasticsearch port. Default: 9200
* ES_USER: Elasticsearch user
* ES_PASSWORD: Elasticsearch user password
* NODE_ENV: The node environment the project is running under. Valid environments are:
  * `prodcution` or `prod`
  * `staging` or `stag`
  * `development` or `dev`
* USE_HSTS - Boolean indicating wheather to use HSTS (HTTP Strict Transport Security). This should always be set to `true` for productions environments
* HSTS_MAX_AGE - Integer representing the miliseconds to consider this host a HSTS host.

```bash
docker run -p 3001:3001 \
  -e NODE_ENV=dev \
  -e ES_PORT=9200 \
  -e ES_HOST=yourElasticsearch_host \
  codegov/code-gov-api
```

### Docker compose

Docker compose lets you recreate a complete environment for the code.gov API. The `docker-compose.yml` file lets us define how these services are stood up, how they relate to each other, and manages other low level things. For more detailed information on Docker Compose take a look at [https://docs.docker.com/compose/](https://docs.docker.com/compose/).

To stand up a Code.gov AP environment execute `docker compose up` from the root of the project. This command will build a new code-gov-api image, download an Elasticsearch image, and will run all containers in the correct order. You will see the output of each container in your terminal.

Once everything is up and running you can access the API by going to `http://localhost:3001/api`
If you only want to build the code-gov-api image you can execute `docker-compose build`.

## Contributing

Here’s how you can help contribute to code.gov:

* Source Code Policy
  * To provide feedback on the [Federal Source Code Policy](https://sourcecode.cio.gov/), you should follow [this issue tracker](https://github.com/WhiteHouse/source-code-policy/issues)

* Code.gov
  * To provide feedback on [the code.gov website], you should follow this [repository](https://github.com/GSA/code-gov-web) and [this issues tracker](https://github.com/GSA/code-gov-web/issues).
  * If you aren't sure where your question or idea fits, this is a good place to share it.

## Questions

If you have questions, please feel [free to open an issue here](https://github.com/GSA/code-gov-api/issues) or send us an email at code@gsa.gov.

## Public domain

As stated in [CONTRIBUTING](CONTRIBUTING.md):

This project is in the worldwide public domain (in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/)).

All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
