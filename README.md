# A Node.js mysql ORM based on mysql2, to do basic ORM stuff the easiest way possible.

## SETUP in 5 steps

### 1. Load the ORM library
npm i https://github.com/Dorsaz-Michel/NodeJs_Mysql.git#mysql_orm

### 2. Create the folder that will contains the entities
_In this exemple we name it "entities" and we create it at the root of the project_

### 3. Create an entity (in the entity folder) by extending the Entity class provided in the library
import Entity from "mysql_orm/Entity.js";

export default class Users extends Entity {
    firstname;
    lastname;
    role;
}

- _Entity names MUST BE the camelcase equivalent to database tables names_
- _Entity names can be singular or plural_
- _Only fieds that are the camelcase equivalent of the database columns will be filled with values (except for joins when the field is specified)_
- _field "id" is automatically added (herited from Entity)_

### 4. Initialize the ORM
import MysqlORM from "mysql_orm/MysqlORM.js";

await MysqlORM.init({
        host     : 'localhost',
        user     : 'root',
        password : 'pwd',
        database : 'db'
        }, "entities"); // path to the entity folder


### 5. Query the database
- data = await Users.get(1);
- data = await Users.get(1).execute();

_calling execute is not required, using "await" will trigger the query_

## Documentation

### Getting entities
- User.get(2) returns 1 user whose id = 2.
- User.getAll() returns an array containing all users.

### Adding conditions
Usual condition can be applied to the query.

Referencing entities in a condition is done as follow:
- User.getAll().andWhere("User.id > 1") // base entity is referenced with its entity class name 
- User.getAll().with(Role).andWhere("User.id > 1 AND User_Role.id > 1") // any joined entities are referenced using previous reference + "_" + entity class name
- User.getAll().with(Role.with(User).andWhere("User.id > 1 AND User_Role.id > 1 AND User_Role_User.id > 1")

#### andWhere
User.getAll().andWhere("User.id > 1 and User.id < 100") => AND (User.id > 1 and User.id < 100)

User.getAll().andWhere("User.id > :min and User.id < :max", { min: 1, max: 100})


#### orWHere
User.getAll().orWhere("User.id > 1 and User.id < 100") => AND (User.id > 1 and User.id < 100)

User.getAll().orWhere("User.id > :min and User.id < :max", { min: 1, max: 100})

### Joining other entities

#### many-to-one
User.get(1) => user.role = undefined

User.get(1).with(Role) =>  user.role is defined !

#### one-to-many
Role.get(1) => role.users = undefined

Role.get(1).with(Users) => role.users is an array of users !

_If no user is found, role.users will be and empty array_

#### many-to-many
Users.get(1).with(Departement) => unable to map because the link is in table UsersDepartment !

Users.get(1).with(Departement.through(UsersDepartment)) => successfull map !

### Join options
When using .with() an optional parameter "options" can be used to specify some behaviour.

### key
User.get(1).with(Role, { key: 'x' }) => ON User.role_id = Role.x

### parentKey
User.get(1).with(Role, { parentKey: 'x' }) => ON User.x = Role.id

### field
User.get(1).with(Role, { field: 'x' }) => user.role = undefined but user.x is defined !

### condition
User.get(1).with(Role, { condition: 'Role.id > 5' }) => ON User.role_id = Role.id AND Role.id > 5

### Heritance
You can have an entity that exents another entity !

export default class Person extends Entity {
    firstname;
    lastname;
}

export default class Employee extends Person {
    salary;
}

If in database each information is stored in person or employee you can use the following :

- Employee.getAll() => employee.firstname = undefined
- Employee.getAll().as(Person) => employee.firstname is defined !



