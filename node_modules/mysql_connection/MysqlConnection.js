import * as mysql from "mysql2";

/**
 * A layer over mysql2 that allow the creation of a QueryBuilder.<br>
 * <br>
 * NOTE: Option <namedPlaceholders> default to TRUE
 */
export default class MysqlConnection {

    #config;
    constructor(config) {
        this.#config = config;
        this.#config["namedPlaceholders"] = true;
    }

    /**
     *
     * @param {string} sql
     * @param {Object} params
     */
    async query(sql, params = {}) {
        return new Promise((res, rej) => {
            mysql
                .createConnection(this.#config)
                .execute(sql, params, function (error, rows) {
                    if (error) throw error;
                    res(rows);
                });
        })
    }

    createQueryBuilder() {
        return new QueryBuilder(this.#config);
    }

}

class QueryBuilder {

    #config;
    constructor(config) {
        this.#config = config;
    }

    #select = [];
    #from = [];
    #join = [];
    #where = [];
    #groupBy = [];
    #having = [];
    #orderBy = [];
    #limit = '';

    #params;

    /**
     * Add any arguments to the SELECT part.
     *
     * @param {string} columns
     * @return {QueryBuilder}
     */
    select(...columns) {
        this.#select.push(...columns);
        return this;
    }

    /**
     * Add any arguments to the FROM part.
     *
     * @param {string} tables
     * @return {QueryBuilder}
     */
    from(...tables) {
        this.#from.push(...tables);
        return this;
    }

    /**
     * Add a Join after the FROM part.
     *
     * @param {string} table
     * @param {string} on - Join condition (ex: user.role_id = role.id)
     * @param {string} type - Default: LEFT JOIN
     * @return {QueryBuilder}
     */
    join(table, on, type = 'LEFT JOIN') {
        this.#join.push(`${type} ${table} ON ${on}`);
        return this;
    }

    /**
     * Encapsulate the condition in a <AND (condition)> and add it to the WHERE parts.<br>
     *
     * NOTE: Parameters can be escaped in condition like ":paramName" and added to the params
     * with the key corresponding to the name used in condition.<br>
     * (ex: andWhere("id = :dbId", { dbId: 3 })
     *
     * @param {string} condition
     * @param {Object} params
     * @return {QueryBuilder}
     */
    andWhere(condition, params = {}) {
        this.#where.push(`AND (${condition})`);
        return this.setParams(params);
    }

    /**
     * Encapsulate the condition in a <OR (condition)> and add it to the WHERE parts.<br>
     *
     * NOTE: Parameters can be escaped in condition like ":paramName" and added to the params
     * with the key corresponding to the name used in condition.<br>
     * Ex: orWhere("id = :dbId", { dbId: 3 })
     *
     * @param {string} condition
     * @param {Object} params
     * @return {QueryBuilder}
     */
    orWhere(condition, params = {}) {
        this.#where.push(`OR (${condition})`);
        return this.setParams(params);
    }

    /**
     * Add any arguments to the GROUP BY part.
     *
     * @param {string} columns
     * @return {QueryBuilder}
     */
    groupBy(...columns) {
        this.#groupBy.push(...columns);
        return this;
    }

    /**
     * Add any arguments to the HAVING part.
     *
     * @param {string} conditions
     * @return {QueryBuilder}
     */
    having(...conditions) {
        this.#having.push(...conditions);
        return this;
    }

    /**
     * Add column to the ORDER BY part.
     *
     * @param {string} column
     * @param {string} order - Default: ASC
     * @return {QueryBuilder}
     */
    orderBy(column, order = 'ASC') {
        this.#orderBy.push(`${column} ${order}`);
        return this;
    }

    /**
     * Parameters can be escaped like ":paramName" and added to the params
     * with the key corresponding to the name used in condition.<br>
     * Ex: "id = :dbId" => setParam("dbId", 3)
     *
     * @param {string} key
     * @param {string|number} value
     * @return {QueryBuilder}
     */
    setParam(key, value) {
        this.#params[key] = value;
        return this;
    }

    /**
     * Parameters can be escaped like ":paramName" and added to the params
     * with the key corresponding to the name used in condition.<br>
     * Ex: "id = :dbId" => setParams({ dbId: 3 })
     *
     * @param {Object} params
     * @return {QueryBuilder}
     */
    setParams(params) {
        this.#params = { ...this.#params, ...params};
        return this;
    }

    /**
     * Build and return the current query string.
     *
     * @return {string}
     */
    getSql() {
        return `SELECT ${this.#select.join(', ')} 
                FROM ${this.#from.join(', ')}
                ${this.#join.join('\n')}
                WHERE 1 ${ this.#where.join('\n') }
                ${this.#groupBy.length > 0 ? `GROUP BY ${this.#groupBy.join(', ')}` : ''}
                ${this.#having.length > 0 ? `HAVING ${this.#having.join(', ')}` : ''}
                ${this.#orderBy.length > 0 ? `ORDER BY ${this.#orderBy.join(', ')}` : ''}
                ${this.#limit}
        `;
    }

    /**
     * Execute the query and return the result as a Promise.
     *
     * @return {Promise}
     */
    async execute() {
        return new Promise((resolve, reject) => {
            let sql = this.getSql();
            mysql
                .createConnection(this.#config)
                .execute(sql, this.#params, function (error, rows) {
                    if (error)
                        reject(error);
                    resolve(rows);
                });
        })
    }

    async then(resolve, reject) {
        this.execute()
            .then(resolve)
            .catch(reject);
    }
}