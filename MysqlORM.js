import fs from "fs";
import Entity from "./Entity.js";
import MysqlConnection from "mysql_connection/MysqlConnection.js";

export default class MysqlORM {

    /** @type {MysqlConnection} */
    #mysqlConnection;

    constructor(config, entitiesDirectoryPath) {
            this.#mysqlConnection = new MysqlConnection(config);

        if (fs.existsSync(entitiesDirectoryPath))
            this.#recursiveEvaluate(entitiesDirectoryPath);
        else
            throw new Error(`Unable to find entities directory '${entitiesDirectoryPath}'`);
    }

    /**
     *
     * @param path
     * @return {void}
     */
    async #recursiveEvaluate(path) {

        let entries = fs.readdirSync(path,  { withFileTypes: true })

        for (let i = 0; i < entries.length; i++) {
            let entry = entries[i];

            if (entry.isDirectory()) {
                await this.#recursiveEvaluate(`${path}/${entry.name}`);
                return;
            }

            let entityClass = (await import(`${process.platform === 'win32' ? 'file://' : ''}${path}/${entry.name}`)).default

            if (entityClass?.prototype instanceof Entity) {

                if (!entityClass._meta) {
                    entityClass._meta = {}
                }
                if (!entityClass._meta[entityClass.name]) {
                    entityClass._meta[entityClass.name] = {}
                }

                entityClass._meta[entityClass.name].db = {
                    fields: {},
                    connection: this.#mysqlConnection
                }

                let columns = await this.#mysqlConnection.query(`SHOW COLUMNS FROM ${toSnakeCase(entityClass.name)}`);

                columns.forEach(([name, type, nullable, key, defaultValue]) => {
                    entityClass._meta[entityClass.name].db.fields[name] = {
                        type,
                        nullable,
                        key,
                        defaultValue
                    }
                })
            }
        }
    }
}
function toCamelCase(word) {
    return word.split('_').map((part, i) => i > 0 ? part[0].toUpperCase() + part.substring(1) : part).join('');
}

function toSnakeCase(word) {
    return word[0].toLowerCase() + word.substring(1).split('').map(letter => letter === letter.toUpperCase() ? '_' + letter.toLowerCase() : letter.toLowerCase()).join('');
}

function toPlural(word) {
    if (word.at(-1) === 's')
        return word + 'es';
    else
        return word + 's';
}

function toSingular(word) {
    if (word.at(-1) === 'ses')
        return word.slice(0, -2);
    else if (word.at(-1) === 's')
        return word.slice(0, -1);
    else
        return word;
}

export {
    toCamelCase,
    toSnakeCase,
    toPlural,
    toSingular
}