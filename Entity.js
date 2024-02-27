import EntityQuery from "./EntityQuery.js";
import EntityQueryJoin, {EntityQueryJoinThrough} from "./EntityQueryJoin.js";

export default class Entity {

    id;

    /**
     * Find the element corresponding to the provided id.
     *
     * @param id
     * @return {EntityQuery}
     */
    static get(id) {
        return new EntityQuery(this, 'entity').andWhere(`${this.name}.id = :id`, { id });
    }

    /**
     * Find all element.
     *
     * @return {EntityQuery}
     */
    static getAll() {
        return new EntityQuery(this);
    }

    /**
     * Add elements corresponding to the relation with the provided entity.<br>
     * Ex: User.with(Address) will add address to user.address or to user.addresses (depending on if the relation is many-to-one or one-to-many) <br>
     * <br>
     * <u><b>options :</b></u> <br>
     * <ul>
     *     <li>key : Specify which column in the entity is used for the relation,</li>
     *     <li>parentKey: Specifiy which column in the parent entity (the one before .with) is used for the relation,</li>
     *     <li>condition: Specifiy additional conditions to be used in the ON part of the join.</li>
     * </ul>
     *
     * @param {Entity.} entity
     * @param {{
     *     key: string?,
     *     parentKey: string?,
     *     condition: string?
     * }} options
     * @return {EntityQuery}
     */
    static with(entity, options = {}) {
        return EntityQueryJoin.create(this, entity, options);
    }

    /**
     * Add elements information corresponding to the relation with the provided entity.<br>
     * Ex: User.as(Person) will add Person fields to the user in order to do user.firstname and not user.person.firstname<br>
     * <br>
     * <u><b>options :</b></u> <br>
     * <ul>
     *     <li>key : Specify which column in the entity is used for the relation,</li>
     *     <li>parentKey: Specifiy which column in the parent entity (the one before .with) is used for the relation,</li>
     *     <li>condition: Specifiy additional conditions to be used in the ON part of the join.</li>
     * </ul>
     *
     * @param {Entity.} entity
     * @param {{
     *     key: string?,
     *     parentKey: string?,
     *     condition: string?
     * }} options
     * @return {EntityQuery}
     */
    static as(entity, options= {}) {
        return EntityQueryJoin.createAs(this, entity, options);
    }

    /**
     * Add links information of a join-table to allow a .with on a many-to-many relationship<br>
     * Ex: User.through(UsersDepartments) will add UsersDepartments information to the user in order to do
     * Department.with(User) => Department.with(User.through(UsersDepartments))<br>
     * <br>
     * <u><b>options :</b></u> <br>
     * <ul>
     *     <li>key : Specify which column in the entity is used for the relation,</li>
     *     <li>parentKey: Specifiy which column in the parent entity (the one before .with) is used for the relation,</li>
     *     <li>condition: Specifiy additional conditions to be used in the ON part of the join.</li>
     * </ul>
     *
     * @param {Entity.} entity
     * @param {{
     *     key: string?,
     *     parentKey: string?,
     *     condition: string?
     * }} options
     * @return {EntityQueryJoinThrough}
     */
    static through(entity, options= {}) {
        return new EntityQueryJoinThrough(this, entity, options);
    }
}







