const pause = (duration) => new Promise(res => setTimeout(res, duration));

const backoff = (fn, fnOptions, retries = 5, delay = 500) =>
  fn(fnOptions).catch(err => retries < 1
    ? pause(delay).then(() => backoff(retries - 1, fn , delay * 2))
    : Promise.reject(err));

const getLabelValue = (label, regExp) => {
  let match = label.match(regExp);
  return match['input'].split(' ')[1] || null;
}

/**
 * Calculates the wait time needed to not hit the Github rate limit wall.
 * @param {Object} client - Github response object.
 */
const getWaitTime = async (client) => {
  const response = await client.misc.getRateLimit();
  const { limit, remaining, reset } = response.data.rate;

  const precentRemaining = remaining / limit;
  if(precentRemaining <= 0.15) {
    return reset - new Date().getTime();
  }
  return 2000;
}

/**
 * Paginate over Github data from specified Github client method.
 * @param {Object} client - Instantiated and authenticated Github client.
 * @param {Function} method - Client method to paginate through
 * @param {Object} options - Parameters to pass to the method argument
 * @returns {Promise} Paginated Github data.
 */
async function paginate(client, method, options) {
  try {
    let waitTime = await getWaitTime(client);

    let response = await backoff(method, options, 3, waitTime);
    let {data} = response;
    while (client.hasNextPage(response)) {
      waitTime = await getWaitTime(client);
      response = await backoff(client.getNextPage, response, 3, waitTime);
      data = data.concat(response.data);
    }
    return data;
  } catch(error) {
    console.error(error);
  }
}
module.exports = {
  pause,
  backoff,
  getLabelValue,
  getWaitTime,
  paginate
};
