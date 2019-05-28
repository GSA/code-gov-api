[![CircleCI](https://circleci.com/gh/GSA/code-gov-api.svg?style=shield&circle-token=a7551669b06edee93c482a338d87d354974faa9f)](https://circleci.com/gh/GSA/code-gov-api)
[![Maintainability](https://api.codeclimate.com/v1/badges/c7f588c467b66045efdf/maintainability)](https://codeclimate.com/github/GSA/code-gov-api/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/c7f588c467b66045efdf/test_coverage)](https://codeclimate.com/github/GSA/code-gov-api/test_coverage)
[![Issue Count](https://codeclimate.com/github/GSA/code-gov-api/badges/issue_count.svg)](https://codeclimate.com/github/GSA/code-gov-api)

# Code.gov API - Unlocking the potential of the Federal Government’s software

Our backend API. This project is an Express.js application backed by Elasticsearch. Its primary function is to index and make America's source code discoverable and searchable.

## Introduction

### What is Code.gov?

[Code.gov](https://code.gov) is a website promoting good practices in code development, collaboration, and reuse across the U.S. Federal Government. Code.gov will provide tools and guidance to help agencies implement the [Federal Source Code Policy](https://code.gov/#!/policy-guide/docs/overview/introduction). It will include an inventory of the government's custom code to promote reuse between agencies. Code.gov will also provide tools to help government and the public collaborate on open source projects.

<details>
<summary>Click to show more details</summary>

Looking for more general information about Code.gov and all of its projects? We have a repo for that! [code-gov](https://github.com/gsa/code-gov) is the main place to find out more general information about Code.gov as a platform and program.

If you have any general feedback or do not know where to place an particular issue, please feel free to use [code-gov to create new issues](https://github.com/gsa/code-gov/issues/new).

</details>

## Installation

Please install the following dependencies before running this project:

* [Node.js](https://nodejs.org/en/download/)
* [Elasticsearch](https://www.elastic.co/downloads/elasticsearch)

Once node is installed, install the local npm dependencies

```
cd code-gov-api && npm install
```

## Running

### Environment Variables

Before running any of the commands included in the `package.json` file there are some environment variables that need to be set:

* NODE_ENV: The node environment the project is running under. Valid environments are:
  * `prodcution` or `prod`
  * `staging` or `stag`
  * `development` or `dev`

* LOGGER_LEVEL: The output level of all the logs produced by the application. This extends to the Elasticsearch library. Defaults to `info`.
  <details>
  <summary>Click for details on logger levels</summary>

  We use Bunyan for our logging. More info on logger levels can be found at [https://github.com/trentm/node-bunyan#levels](https://github.com/trentm/node-bunyan#levels)
  </details>

* NEW_RELIC_KEY (optional) - Your New Relic key. You will need a New Relic account to get one. For more inforamation visit the [New Relic docs](https://docs.newrelic.com/docs/accounts/install-new-relic/account-setup/license-key).

* USE_HSTS: Sets the use of [HTTP Strict Transport Security](https://www.owasp.org/index.php/HTTP_Strict_Transport_Security_Cheat_Sheet). The default value depends on the value set for NODE_ENV. This variable is set to true if in production or false if not in production.

* HSTS_MAX_AGE: A HSTS required directive. For more information on what it is used for please visit [https://tools.ietf.org/html/rfc6797#section-6.1.1](https://tools.ietf.org/html/rfc6797#section-6.1.1). This value defaults to `31536000` milliseconds

* HSTS_PRELOAD: Whether or not to use the HSTS pre-loaded lists. Defaults to `false`. More information on HSTS pre-loaded lists can be found at [https://tools.ietf.org/html/rfc6797#section-12.3](https://tools.ietf.org/html/rfc6797#section-12.3).

* PORT: Port to be used by the API. Defaults to `3000`.

* ES_HOST: URL for the Elasticsearch host to be used by the API and harvesting process. This URL should also contain the user and password needed to use the Elasticsearch service. Defaults to `http://elastic:changeme@localhost:9200`

  <details>
    <summary>Click for more details on Elasticsearch Auth</summary>

    Elasticsearch has a built in REST API with its own internal security features. The user `elastic` with the password `changeme` is the default super user. This should not be used this way in a production environment.

    For more information about how to configure the authentication for Elasticsearch click [here](https://www.elastic.co/guide/en/x-pack/current/setting-up-authentication.html).
  </details>

* GITHUB_AUTH_TYPE: The type of authentication mechanism to use with the Github API. Defaults to `token`.

  <details>
    <summary>Click here for more information on Github Authentication Types</summary>

    There are a couple of different ways you can interact with the Github API. The more common ones are:
    * basic authentication
    * OAuth2 token based authentication
    * OAuth2 key/secret based authentication

    For more information please click [here](https://developer.github.com/v3/#authentication)
  </details>

* GITHUB_TOKEN: The token to use for Github API access. This variable has no default value and needs to be provided by you. This token can be obtained in your Github profile settings. For more info please click [here](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/).

### Data Harvesting

This project uses Elasticsearch to store code repository metadata. As such, it is necessary to run an indexing process which will populate the necesary indexes in Elasticsearch.

Make sure that Elasticsearch is running and is accessible.

<details>
  <summary>Click here for more info on installing and running Elasticsearch</summary>

  To install Elasticsearch on your machine please follow the instructions found [here](https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html).

  We have found that using Elasticsearch within a [Docker](#Docker) container is one of the simplest ways to get up and running. We have included a [Docker](#Docker) compose file in this project that can help you get on your way.

  Please take a look at the [Getting Started](https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started.html) and [Set up Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/setup.html) sections in the Elastic documentaion.
</details>

Once verified that Elasticsearch is up execute:

```
npm run index
```

This will start the harvesting and indexing process. Once this process is finished all data should be available for the API.

### Starting the API

After the indexing process runs, you can fire up the server by running:

```
npm start
```

The API should now be accessible via the browser (or curl) at [http://localhost:3000/api/](http://localhost:3001/api/).

<details>
  <summary>Click for the cUrl command</summary>

  ```
  curl http://localhost:3000/api/
  ```
</details>

## Docker

For more detailed documentation on Docker and its components please visit their [documentation site](https://docs.docker.com/).

### Build

To run a container you first have to build an image. To do so you can execute

```bash
docker build -t <name_and_tag_for_your_image> .
```

<details>
  <summary>Click for example</summary>

  For us, `Code.gov`, the command would be:

  ```bash
  docker build -t codegov/code-gov-api .
  ```
</details>

To verify that the image was created you can execute

```bash
docker images
```

Look for the `name_and_tag_for_your_image` that you used to build the image.

![docker-build](https://media.giphy.com/media/1rM5KOD27FiHrcDhQd/giphy.gif)

### Run a container

To create and run a container execute:

```bash
docker run -p 3000:3000 codegov/code-gov-api
```

If you want the container to run in the background (detached) pass the `-d` flag to the `docker run` command.

Eg:

```bash
docker run -d -p 3000:3000 codegov/code-gov-api
```

To attach the project's source directory to the containers volume execute `docker run -d -p 3000:3000 -v <path_to_project>:/usr/src/app codegov/code-gov-api`

Eg.

```bash
docker run -d -p 3000:3000 -v /home/user/code-gov-api:/usr/src/app codegov/code-gov-api
```

For more information on how to use Docker volumes take a look at:

* [Dockerfile](https://docs.docker.com/engine/reference/builder/#volume)
* [Docker compose](https://docs.docker.com/compose/compose-file/#volumes)

#### Container Env

The code-gov-api container accepts a number of environment variables. They are the same variables found [here](#Environment-Variables).

<details>
  <summary>Click here for an example</summary>

  ```bash
  docker run -p 3000:3000 \
    -e NODE_ENV=dev \
    -e ES_HOST="http://elastic:changeme@localhost:9200" \
    codegov/code-gov-api
  ```

</details>

### Docker compose

Docker compose lets you recreate a complete environment for the code.gov API. The `docker-compose.yml` file lets us define how these services are stood up, how they relate to each other, and manages other low level things. For more detailed information on Docker Compose take a look at [https://docs.docker.com/compose/](https://docs.docker.com/compose/).

To stand up a Code.gov API environment execute from the root of the project:

```bash
docker-compose up
```

This command will build a new code-gov-api image, download an Elasticsearch image, and will run all containers in the correct order. You will see the output of each container in your terminal.

Once everything is up and running you can access the API in your browser at: `http://localhost:3001/api`.
If you only want to build the code-gov-api image you can execute `docker-compose build`.

## Contributing

Here’s how you can help contribute to code.gov API:

* First, please take some time to read our [contributing document](/docs/CONTRIBUTING.md). To ensure consistency, we have also created a [branching](/docs/BRANCHING.md) doc which describes our git branching strategy and a [styleguide](/docs/STYLEGUIDE.md).

* Code of Conduct
  * Community is very important for us. We strive to be welcoming to all. To achive this we have drafted a [Code of Conduct](CODE_OF_CONDUCT.md), please take a look at it and leave us any feedback as a [Github issue](https://github.com/GSA/code-gov-api/issues).

* Source Code Policy
  * To provide feedback on the [Federal Source Code Policy](https://sourcecode.cio.gov/), you should follow [this issue tracker](https://github.com/WhiteHouse/source-code-policy/issues).

* General Code.gov
  * To provide feedback on the code.gov website, you should follow this [repository](https://github.com/GSA/code-gov-web) and [this issues tracker](https://github.com/GSA/code-gov-web/issues).

  * If you aren't sure where your question or idea fits, please take a look at the [code-gov repository](https://github.com/GSA/code-gov) and its [issue tracker](https://github.com/GSA/code-gov/issues). From this repository you can navigate to any of our other tools and repos.

## Questions

If you have questions, please feel [free to open an issue here](https://github.com/GSA/code-gov-api/issues) or send us an email at code@gsa.gov.

## Public domain

As stated in our [contributing document](CONTRIBUTING.md):

This project is in the worldwide public domain (in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/)).

All contributions to this project will be released under the CC0-1.0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
