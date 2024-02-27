import EntityQueryJoin from "./EntityQueryJoin.js";
import {toCamelCase, toPlural, toSingular, toSnakeCase} from "./MysqlORM.js";

export default class EntityQuery {

    /** @type {MysqlConnection} */
    #mysqlConnection;

    #entityClass;
    #queryBuilder;
    #fieldMaps = [];

    #resultType;

    constructor(entityClass, resultType='array') {

        this.#resultType = resultType;

        this.#mysqlConnection = entityClass._meta[entityClass.name].db.connection;
        this.#entityClass = entityClass;

        this.#queryBuilder = this.#mysqlConnection.createQueryBuilder()
            .select(...Object.keys(entityClass._meta[entityClass.name].db.fields).map(field => `${entityClass.name}.${field}`))
            .from(`${toSnakeCase(entityClass.name)} AS ${entityClass.name}`)
            .orderBy(`${entityClass.name}.id`);
    }


    /**
     * @type {EntityQueryJoin}
     */
    #join;

    /**
     * Add elements corresponding to the relation with the provided entity.<br>
     * Ex: User.with(Address) will add address to user.address or to user.addresses (depending on if the relation is many-to-one or one-to-many) <br>
     * <br>
     * <u><b>options :</b></u> <br>
     * <ul>
     *     <li>key : Specify which column in the entity is used for the relation,</li>
     *     <li>parentKey: Specifiy which column in the parent entity (the one before .with) is used for the relation,</li>
     *     <li>field: Specify the name of the parent field where elements will be added,</li>
     *     <li>condition: Specifiy additional conditions to be used in the ON part of the join.</li>
     * </ul>
     *
     * @param {Entity.} entity
     * @param {{
     *     key: string?,
     *     parentKey: string?,
     *     field: string?,
     *     condition: string?
     * }} options
     * @return {EntityQuery}
     */
    with(entity, options= {}) {
        if (!this.#join)
            this.#join = EntityQueryJoin.create(this.#entityClass, entity, options);
        else
            this.#join.with(entity, options);

        return this;
    }

    /**
     * Add elements information corresponding to the relation with the provided entity.<br>
     * Ex: User.as(Person) will add Person fields to the user in order to do user.firstname and not user.person.firstname<br>
     * <br>
     * <u><b>options :</b></u> <br>
     * <ul>
     *     <li>key : Specify which column in the entity is used for the relation,</li>
     *     <li>parentKey: Specifiy which column in the parent entity (the one before .with) is used for the relation,</li>
     *     <li>field: Specify the name of the parent field where elements will be added,</li>
     *     <li>condition: Specifiy additional conditions to be used in the ON part of the join.</li>
     * </ul>
     *
     * @param {Entity.} entity
     * @param {{
     *     key: string?,
     *     parentKey: string?,
     *     field: string?,
     *     condition: string?
     * }} options
     * @return {EntityQuery}
     */
    as(entity, options= {}) {
        if (!this.#join)
            this.#join = EntityQueryJoin.createAs(this.#entityClass, entity, options);
        else
            this.#join.as(entity, options);
        return this;
    }

    #recursiveAddJoin(join) {

        let additionalCondition = join.condition ? `AND ${join.condition}` : '';

        this.#queryBuilder
            .join(`${join.getTable()} ${join.getAlias()}`, `${join.getAlias()}.${join.column} = ${join.parent.getAlias()}.${join.parentColumn} ${additionalCondition}`)
            .select(...join.getColumns().map(column => `${join.getAlias()}.${column}`))
            .orderBy(`${join.getAlias()}.id`);

        join.getJoins().forEach(join => {
            this.#recursiveAddJoin(join);
        })
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
     * @return {EntityQuery}
     */
    andWhere(condition, params = {}) {
        this.#queryBuilder.andWhere(condition, params);
        return this;
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
     * @return {EntityQuery}
     */
    orWhere(condition, params = {}) {
        this.#queryBuilder.orWhere(condition, params);
        return this;
    }
    /**
     * Add any arguments to the GROUP BY part.
     *
     * @param {string} columns
     * @return {EntityQuery}
     */
    groupBy(...columns) {
        this.#queryBuilder.groupBy(...columns);
        return this;
    }

    /**
     * Build and return the current query string.
     *
     * @return {string}
     */
    getSql() {
        return this.#queryBuilder.getSql();
    }

    /**
     * Execute the query and return the result as a Promise.
     *
     * @return {Promise}
     */
    async execute() {
        return new Promise(async (resolve, reject) => {
            try {

                if (!this.#join)
                    this.#fieldMaps = Object.keys(this.#entityClass._meta[this.#entityClass.name].db.fields).map(column => [column.at(0).toLowerCase() + toCamelCase(column.substring(1)), column]);
                else {
                    this.#fieldMaps = this.#join.getFieldsMap();

                    this.#join.getJoins().forEach(join => {
                        this.#recursiveAddJoin(join);
                    })
                }

                let data = await this.#queryBuilder;

                let response = [];

                let entity;
                data.forEach(rowData => {
                    if (entity?.id !== rowData[0]) {
                        entity = new this.#entityClass();
                        response.push(entity);
                    }

                    this.#hydrate(entity, rowData, Object.entries(this.#fieldMaps));
                })

                if (this.#resultType === 'array')
                    resolve(response);
                else
                    resolve(response[0]);
            }
            catch (err) {
                reject(err);
            }
        })
    }

    async then(resolve, reject) {
        this.execute()
            .then(resolve)
            .catch(reject);
    }

    #hydrate(entity, data, fieldsMap, dataIndex = 0) {

        fieldsMap.forEach(([i, [field, map]]) => {

            if (typeof map === 'string') {
                if (!entity[field] && Object.keys(entity).includes(field))
                    entity[field] = data[dataIndex];
            }
            else if (map.type === 'include') {
                dataIndex--;
            }
            else {

                let boundEntityClass = map.entityClass;

                if (!Object.keys(entity).includes(field)) {
                    if (Object.keys(entity).includes(toPlural(field)))
                        field = toPlural(field);
                    else if (Object.keys(entity).includes(toSingular(field)))
                        field = toSingular(field);
                    else
                        throw new Error(`Unable to map ${entity.constructor.name} to ${boundEntityClass.name} !\nNo field with name '${field}' was found in class ${entity.constructor.name}.\nDefine option 'field' to specify a field name to use`)
                }

                let boundEntity;

                if (data[dataIndex] === null) {
                    boundEntity = new boundEntityClass();

                    if (!(entity[field] instanceof Array) && map.type === 'single')
                        entity[field] = null;
                    else
                        entity[field] = [];
                }
                else if (entity[field]) { // Field is already set
                    if (entity[field] instanceof Array) {
                        if (entity[field].length > 0 && entity[field].at(-1).id === data[dataIndex])
                            boundEntity = entity[field].at(-1).id;
                        else {
                            boundEntity = new boundEntityClass();
                            entity[field].push(boundEntity);
                        }
                    }
                    else {
                        if (entity[field].id === data[dataIndex]) {
                            boundEntity = entity[field];
                        }
                        else {
                            boundEntity = new boundEntityClass()
                            entity[field] = [entity[field], boundEntity];
                        }
                    }
                }
                else {
                    boundEntity = new boundEntityClass();

                    if (map.type === 'single')
                        entity[field] = boundEntity;
                    else
                        entity[field] = [boundEntity];
                }

                dataIndex = this.#hydrate(boundEntity, data, Object.entries(map.fieldsMap), dataIndex);
            }

            dataIndex++;
        })

        return dataIndex-1;
    }
}