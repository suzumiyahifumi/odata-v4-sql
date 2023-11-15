const { Op, Sequelize } = require('sequelize');
const createQuery = require('../src/index').createQuery;

const querystring = `$top=5&$skip=1&$select=name,id&$filter=name eq Test and id eq 2 and contains(name,'red')&$orderby=name desc&$expand=Locations($filter=Price gt 5.00),Datastreams`;

let sql_parser = createQuery(querystring);

console.log("[[odata]]:", sql_parser.from());
console.log("[[odata.where]]:", sql_parser.where[Op.and][1][Op.and][1].Name[Op.contains]);
console.log("[[odata]]:", JSON.stringify(sql_parser.where[Op.and][1][Op.and], undefined, '\t'));
console.log("[[odata]]:", JSON.stringify(sql_parser.includes[0].where, undefined, '\t'));