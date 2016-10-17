
/**
 * Defines an abstract adapter for getting search clients 
 * 
 * @class AbstractSearchAdapter
 */
class AbstractSearchAdapter {

    /**
     * Gets an instance of a client 
     * 
     * @returns
     */
    getClient() {
        return this.client;
    }
}

module.exports = AbstractSearchAdapter;