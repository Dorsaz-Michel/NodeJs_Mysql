import Entity from "./Entity.js";
import {toCamelCase, toPlural, toSingular, toSnakeCase} from "./MysqlORM.js";

export default class EntityQueryJoin {

    entityClass;
    field;
    column;

    parent;
    parentColumn;

    condition;

    static create(parent, child, options= {}) {
        if (parent.prototype && parent.prototype instanceof Entity)
            parent = new this(parent);
        if (child.prototype && child.prototype instanceof Entity)
            child = new this(child);

        parent.with(child, options);
        return parent;
    }

    static createAs(parent, child, options= {}) {
        if (parent.prototype &&  parent.prototype instanceof Entity)
            parent = new this(parent);
        if (child.prototype && child.prototype instanceof Entity)
            child = new this(child);

        parent.as(child, options);
        return parent;
    }

    constructor(entityClass) {
        this.entityClass = entityClass;
    }

    #children = [];
    #joins = [];
    with(child, options = {}) {
        child.type = 'with';
        this.#children.push({ child, options });
        return this;
    }

    as(child, options= {}) {
        child.type = 'as';
        this.#children.push({ child, options });
        return this;
    }

    /**
     *
     * @param child
     * @param options
     * @return {{prototype}|*|EntityQueryJoin}
     * @throws Error
     */
    join(child, options = {}) {
        if (child.prototype && child.prototype instanceof Entity)
            child = new EntityQueryJoin(child);

        if (child instanceof EntityQueryJoinThrough) {
            child.options.field = options.field;
            let joinThrough = child.joinTable.with(child.destTable, child.options);
            joinThrough.type = 'as';
            return this.join(joinThrough, options);
        }

        let {
            key = toSnakeCase(this.entityClass.name),
            parentKey = toSnakeCase(child.entityClass.name),
            field = child.entityClass.name[0].toLowerCase() + toCamelCase(child.entityClass.name.substring(1)),
            condition,
        } = options;

        let joinKey = key;

        child.parent = this;
        child.condition = condition;
        child.field = field;

        let parentSuffix = options.parentKey ? '' : '_id';
        let joinSuffix = options.key ? '' : '_id';

        // CHECK DEFAULT
        if (this.entityClass._meta[this.entityClass.name].db.fields[parentKey + parentSuffix]) {
            child.column = 'id';
            child.parentColumn = parentKey + parentSuffix;
        }
        else if (child.entityClass._meta[child.entityClass.name].db.fields[joinKey + joinSuffix]) {
            child.column = joinKey + joinSuffix;
            child.parentColumn = 'id';
        }
        // CHECK PLURAL
        else if (this.entityClass._meta[this.entityClass.name].db.fields[toPlural(parentKey) + parentSuffix]) {
            child.column = 'id';
            child.parentColumn = toPlural(parentKey) + joinSuffix;
        }
        else if (child.entityClass._meta[child.entityClass.name].db.fields[toPlural(joinKey) + joinSuffix]) {
            child.column = toPlural(joinKey) + joinSuffix;
            child.parentColumn = 'id';
        }
        // CHECK SINGULAR
        else if (this.entityClass._meta[this.entityClass.name].db.fields[toSingular(parentKey) + parentSuffix]) {
            child.column = 'id';
            child.parentColumn = toSingular(parentKey) + parentSuffix;
        }
        else if (child.entityClass._meta[child.entityClass.name].db.fields[toSingular(joinKey) + joinSuffix]) {
            child.column = toSingular(joinKey) + joinSuffix;
            child.parentColumn = 'id';
        }
        else
            throw new Error(`Unable to map ${this.entityClass.name} to ${child.entityClass.name} !\nNo foreign key (plural and singular) ${this.entityClass.name} '${parentKey}' or ${child.entityClass.name} '${joinKey}' was found.\nDefine option 'key' or 'parentKey' to specify a foreign key name to use`)

        return child;
    }

    /**
     *
     * @return {*[]}
     * @throws Error
     */
    getFieldsMap() {
        let fieldsMap = [];
        fieldsMap.push(...Object.keys(this.entityClass._meta[this.entityClass.name].db.fields).map(key => [key.at(0).toLowerCase() + toCamelCase(key.substring(1)), key]));
        this.#children.forEach(joinInfos => {

            let {child, options } = joinInfos;

            try {
                let join;

                join = this.join(child, options);

                if (join.type === 'as') {
                    fieldsMap.push(...join.getFieldsMap());
                    fieldsMap.push([join.field, {
                        entityClass: join.entityClass,
                        type: 'include',
                        fieldsMap: []
                    }])
                }
                else {
                    fieldsMap.push([join.field, {
                        entityClass: join.entityClass,
                        type: join.column === 'id' ? 'single' : 'many',
                        fieldsMap: join.getFieldsMap()
                    }])
                }

                this.#joins.push(join);
            }
            catch (err) {
                throw err;
            }
        })
        return fieldsMap
    }

    /**
     * @return {EntityQueryJoin[]}
     */
    getJoins() {
        return this.#joins;
    }

    getTable() {
        return toSnakeCase(this.entityClass.name);
    }

    getAlias() {
        if (!this.parent)
            return this.entityClass.name;
        else
            return this.parent.getAlias() + "_" + toCamelCase(this.entityClass.name);
    }

    getColumns() {
        return Object.keys(this.entityClass._meta[this.entityClass.name].db.fields);
    }
}

class EntityQueryJoinThrough  {
    destTable;
    joinTable;
    options;

    constructor(destTable, joinTable, options = {}) {
        this.destTable = destTable;
        this.joinTable = joinTable;
        this.options = options;
    }
}

export {
    EntityQueryJoinThrough
}

