/*global _*/

/**
 * Emulates d3's data binding mechanism for non-DOM selections. It will either
 * maintain a set of data directly, or map it to objects if given a factory
 * method. Provides enter and exit selections, and all() for a "merged"
 * selection containing the update and enter selections combined, i.e. all
 * objects contained in the current data set.
 *
 * For more information on D3's selections, please see the D3 docs.
 *
 * @returns {object}
 */
function dataJoin() {
    var join = {};
    var data;
    var enter;
    var exit;
    var dataIndex = {};
    var objectIndex;
    var factory;
    var destroy;
    var cache;

    /**
     * Takes a given set of data and binds it to selections. If no value is
     * passed, returns the current data set.
     *
     * @param       {array}     [value] Array of values to bind
     * @param       {function}  [id]    Identifier accessor function for data constancy
     * @returns     {object}
     */
    join.data = function(value, id) {
        if (_.isUndefined(value)) {
            return _.map(data, function (d) {
                return dataIndex ? dataIndex[d] : d;
            });
        }

        updateSelections(value, id);

        return this;
    };

    /**
     * Returns a merged selection containing enter() and update selections.
     *
     * @returns {array}
     */
    join.all = function() {
        return cache.all || (cache.all = identify(data));
    };

    /**
     * Returns the enter selection.
     *
     * @returns {array}
     */
    join.enter = function() {
        return cache.enter || (cache.enter = identify(enter));
    };

    /**
     * Returns the exit selection.
     *
     * @returns {array}
     */
    join.exit = function() {
        return cache.exit || (cache.exit = identify(exit));
    };

    /**
     * Assigns a factory and a disassembler function to the join, which will
     * map each data item to the returned value of that factory function. The
     * disassembler function is used to destroy the object created by the
     * factory, when the item leaves the current data set, i.e. it is part of
     * the exit selection.
     *
     * @param   {function}  createFn
     * @param   {function}  destroyFn
     * @returns {object}
     */
    join.factory = function(createFn, destroyFn) {
        factory = createFn;
        destroy = destroyFn;
        return this;
    };

    /**
     * Generates the new enter and exit selections, based on a new data set,
     * and manages indices that index data and factory-generated items.
     *
     * @param {array}       newData     New data set to join
     * @param {function}    id          Identifier accessor function
     */
    function updateSelections(newData, id) {
        id = _.isString(id) ? _.property(id) : id;
        cache = {};

        var newIndex = id ? _.indexBy(newData, id) : undefined;
        var newDataIds = _.map(newData, function (d) {
            return id ? id(d) : d;
        });

        enter = data ? _.without.apply(_, [newDataIds].concat(data)) : newDataIds;
        exit = data ? _.without.apply(_, [data].concat(newDataIds)) : [];

        data = newDataIds;

        if (newIndex && dataIndex) {
            _.extend(dataIndex, newIndex);
        } else {
            dataIndex = newIndex;
        }

        prune(dataIndex);
        prune(objectIndex);

        _.forIn(objectIndex, function (value, id) {
            if (value[0] !== dataIndex[id]) {
                delete objectIndex[id];
            }
        });

        if (_.isFunction(destroy)) {
            _.each(join.exit(), destroy);
        }
    }

    /**
     * Convert an ID into its relevant objective counterpart. If a factory is
     * present, it will use the object index, otherwise it will return the
     * indexed data item.
     *
     * @param   {string|array} id
     * @returns {object|array}
     */
    function identify(id) {
        if (_.isArray(id)) {
            return _.map(id, identify);
        }

        var data = dataIndex ? dataIndex[id] : id;

        if (factory) {
            if (!objectIndex) {
                objectIndex = {};
            }

            if (!(id in objectIndex)) {
                objectIndex[id] = [data, factory(data)];
            }

            return objectIndex[id][1];
        }

        return data;
    }

    /**
     * Get rid of indexed items that no longer exist in the data or exit selections.
     *
     * @param {object} index
     */
    function prune(index) {
        _.chain(index)
            .keys()
            .each(function (id) {
                id = dataIndex ? dataIndex[id] : id;
                if (!_.contains(data, id) && !_.contains(exit, id)) {
                    delete index[id];
                }
            });
    }

    return join;
}

module.exports = dataJoin;