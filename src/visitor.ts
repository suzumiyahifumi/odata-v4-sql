import { Token } from "odata-v4-parser/lib/lexer";
import { Literal } from "odata-v4-literal";
import { SqlOptions } from "./index";
import { Op, Sequelize } from 'sequelize';
var _ = require('lodash');

export class SQLLiteral extends Literal{
	static convert(type:string, value:string):any {
        return (new SQLLiteral(type, value)).valueOf();
    }
	'Edm.String'(value:string){ return "'" + decodeURIComponent(value).slice(1, -1).replace(/''/g, "'") + "'"; }
	'Edm.Guid'(value:string){ return "'" + decodeURIComponent(value) + "'"; }
	'Edm.Date'(value:string){ return "'" + value + "'"; }
	'Edm.DateTimeOffset'(value:string):any{ return "'" + value.replace("T", " ").replace("Z", " ").trim() + "'"; }
	'Edm.Boolean'(value:string):any{
        value = value || '';
        switch (value.toLowerCase()){
            case 'true': return 1;
            case 'false': return 0;
            default: return "NULL";
        }
    }
	'null'(value:string){ return "NULL"; }
}

export enum SQLLang{
	ANSI,
	MsSql,
	MySql,
	PostgreSql,
	Oracle
}

export class Visitor{
	protected options:SqlOptions
	protected schema:object
	isInclude: boolean = false;
	mainModel: string;
	preModel: string;
	type: SQLLang;
	attributes = [];
	where: object = {};
	order: Array<Array<string>> = [['id', 'ASC']];
	offset:number
	limit:number
	inlinecount:boolean
	navigationProperty:string
	include:Visitor[] = [];
	parameters:any = new Map();
	protected parameterSeed:number = 0;
	protected originalWhere:string;
	ast:Token

	constructor(options = <SqlOptions>{}){
		this.mainModel = options.mainModel;
		this.preModel = options.preModel;

		this.options = options;
		this.schema = options.schema || {};
		if (this.options.useParameters != false) this.options.useParameters = true;
		this.type = options.type || SQLLang.ANSI;
	//	console.log('mainModel',this.mainModel)
	}

	from() {
		let from_ = _.pick(this, ['where', 'order', 'offset', 'limit', 'include', 'attributes', 'model', 'as', 'separate', 'required', 'nested'])
		if (from_.attributes.length == 0) {
			console.log('[[isInclude]]', this.isInclude, '[[preModel]]', this.preModel, "[[mainModel]]", this.mainModel)
			let n = (this.isInclude == true) ? this.getIncludeAliasName(this.preModel, this.mainModel).name : this.changeModel2Singular(this.mainModel).name;
			console.log('[[n]]', n)
			from_.attributes = {
				include: [
					[(this.isInclude == true) ? 'id' : Sequelize.literal(`"${n}"."id"`), '@iot_id']
				],
				exclude: ['id']
			}
		} else if (from_.attributes.indexOf('id') >= 0){
			console.log('[[mainModel]]', `${this.changeModel2Singular(this.mainModel).name}.id`)
			from_.attributes[from_.attributes.indexOf('id')] = ['id', '@iot_id'];
			let n = this.changeModel2Singular(this.mainModel).name;
			from_.attributes = {
				include: [
					[Sequelize.literal((n == null)? 'id' :`${n}.id`), '@iot_id'], ...from_.attributes
				],
				exclude: ['id']
			}
		}
		if (from_.include.length == 0) delete from_.include;
	//	from_.raw = true;
		return from_;
	}
/*
	from(table:string){
		let sql = `SELECT ${this.select} FROM [${table}] WHERE ${this.where} ORDER BY ${this.orderby}`;
		switch (this.type){
      case SQLLang.Oracle:
			case SQLLang.MsSql:
				if (typeof this.skip == "number") sql += ` OFFSET ${this.skip} ROWS`;
				if (typeof this.limit == "number"){
					if (typeof this.skip != "number") sql += " OFFSET 0 ROWS";
					sql += ` FETCH NEXT ${this.limit} ROWS ONLY`;
				}
				break;
			case SQLLang.MySql:
			case SQLLang.PostgreSql:
			default:
				if (typeof this.limit == "number") sql += ` LIMIT ${this.limit}`;
				if (typeof this.skip == "number") sql += ` OFFSET ${this.skip}`;
				break;
		}
		return sql;
	}
*/
/*
	asMsSql(){
		this.type = SQLLang.MsSql;
		let rx = new RegExp("\\?", "g");
		let keys = this.parameters.keys();
		this.originalWhere = this.where;
		this.where = this.where.replace(rx, () => `@${keys.next().value}`);
		this.includes.forEach((item) => item.asMsSql());
		return this;
	}

  asOracleSql(){
    this.type = SQLLang.Oracle;
    let rx = new RegExp("\\?", "g");
    let keys = this.parameters.keys();
    this.originalWhere = this.where;
    this.where = this.where.replace(rx, () => `:${keys.next().value}`);
    this.includes.forEach((item) => item.asOracleSql());
    return this;
  }
*/
	asAnsiSql(){
		this.type = SQLLang.ANSI;
		//this.where = this.originalWhere || this.where;
		this.include.forEach((item) => item.asAnsiSql());
		return this;
	}

	asType(){
		switch (this.type){
		//	case SQLLang.MsSql: return this.asMsSql();
			case SQLLang.ANSI:
			case SQLLang.MySql:
			case SQLLang.PostgreSql: return this.asAnsiSql();
		//	case SQLLang.Oracle: return this.asOracleSql();
			default: return this;
		}
	}

	Visit(node:Token, context?:any):any {
		this.ast = this.ast || node;
		context = context || { target: "where" };
	//	console.log(node)


		var visitor = this[`Visit${node.type}`];
		let next = visitor.call(this, node, context);
		return (node == this.ast)? this:next;
	}

	protected changeModel2Singular(type: string) {
		let type2 = type.toLowerCase();
		switch (type2) {
			case "things":
				return {
					name: "thing", nameOri: type, isModel: true
				};
			case "locations":
				return {
					name: "location", nameOri: type, isModel: true
				};
			case "historicallocations":
				return {
					name: "historicallocation", nameOri: type, isModel: true
				};
			case "datastreams":
				return {
					name: "datastream", nameOri: type, isModel: true
				};
			case "sensors":
				return {
					name: "sensor", nameOri: type, isModel: true
				};
			case "observedproperties":
				return {
					name: "observedproperty", nameOri: type, isModel: true
				};
			case "observations":
				return {
					name: "observation", nameOri: type, isModel: true
				};
			case "featuresofinterest":
				return {
					name: "featureofinterest", nameOri: type, isModel: true
				};
			default:
				return (["thing", "location", "historicallocation", "datastream", "sensor", "observedproperty", "observation", "featureofinterest"].includes(type2)) ? {
					name: type2,
					nameOri: type,
					isModel: true
				} : (type2.split(".").length > 1)? {
					name: null,
					nameOri: type,
					isModel: true
				} : {
					name: null,
					nameOri: type,
					isModel: false
				};
		}
	}
	protected getIncludeAliasName(mainModel: string, expandModel: string) {
		let ex = expandModel.toLowerCase();
		let me = mainModel.toLowerCase();
		let map = {
			'thing': {
				'location': {
					name: 'locations',
					through: true,
					separate: false
				},
				'datastream': 'datastreams'
			},
			'location': {
				'thing': {
					name: 'things',
					through: true,
					separate: false
				}
			},
			'sensor': {
				'datastream': 'datastreams'
			},
			'observedproperty': {
				'datastream': {
					name: 'datastreams',
					through: false,
					separate: true
				}
			},
			'featureofinterest': {
				'observation': {
					name: 'observations',
					through: false,
					separate: true
				}
			},
			'datastream': {
				'thing': 'fk_thing_in_datastream',
				'sensor': 'fk_sensor_in_datastream',
				'observedproperty': 'fk_observedproperty_in_datastream',
				'observation': {
					name: 'observations',
					through: false,
					separate: true
				}
			},
			'observation': {
				'datastream': 'fk_data_in_obs',
				'featureofinterest': 'fk_foi_in_obs'
			},
			'historicallocation': {
				'thing': 'fk_thing_in_historicallocation'
			},
			'things': {
				'location': {
					name: 'locations',
					through: true,
					separate: false
				}, 'datastream': 'datastreams' },
			'locations': {
				'thing': {
					name: 'things',
					through: true,
					separate: false
				} },
			'sensors': { 'datastream': 'datastreams' },
			'observedproperties': {
				'datastream': {
					name: 'datastreams',
					through: false,
					separate: true
				}
			},
			'featuresofinterest': {
				'observation': {
					name: 'observations',
					through: false,
					separate: true
				}
			},
			'datastreams': {
				'thing': 'fk_thing_in_datastream',
				'sensor': 'fk_sensor_in_datastream',
				'observedproperty': 'fk_observedproperty_in_datastream',
				'observation': {
					name: 'observations',
					through: false,
					separate: true
				}
			},
			'observations': {
				'datastream': 'fk_data_in_obs',
				'featureofinterest': 'fk_foi_in_obs'
			},
			'historicallocations': {
				'thing': 'fk_thing_in_historicallocation'
			}
		}
		let re = (typeof map[me][ex] == 'string') ? { name: map[me][ex], through: false, separate: false } : map[me][ex]
		return re || {
			name: ex,
			through: false,
			separate: false
		};
	}

	protected VisitODataUri(node:Token, context:any){
		this.Visit(node.value.resource, context);
		this.Visit(node.value.query, context);
	}

	protected VisitExpand(node: Token, context: any) {
		type pathPair = { type: string; raw: string, include: any };
		let modelList:{} = {};
		let includesArray:Array<pathPair[]> = node.value.items.map((item) => {
			let pathArray:pathPair[] = this.Visit(item.value.path);
			let m = pathArray[pathArray.length - 1].raw;
			let singular = this.changeModel2Singular(m).name;
			let mainModel = this.changeModel2Singular((pathArray.length > 1) ? pathArray[pathArray.length - 2].raw : this.options.mainModel).name;
			let aliasName = this.getIncludeAliasName(mainModel, singular);
			let include = {
				model: this.schema[singular],
				as: aliasName.name,
				separate: aliasName.separate,
				required: false,
				nested: true,
				...this.Visit(item, singular).from()
			};
			if (aliasName.through == true) include.through = {
				attributes: []
			}
			modelList[m] = include;
			pathArray[pathArray.length - 1].include = include;
			return pathArray;
		}).sort((a, b) => {
			return a.length - b.length;
		});
		let modelRoot:Array<string> = [];

		for (let i = 0; i < includesArray.length; i++) {
			for (let index = 0; index < includesArray[i].length; index++){
				let path = includesArray[i][index];
				if (index == 0) modelRoot.push(path.raw);
				if (modelList[path.raw]) { 
					if (index != 0) {
						if (modelList[includesArray[i][index - 1].raw].include == undefined) modelList[includesArray[i][index - 1].raw].include = [];
						modelList[includesArray[i][index - 1].raw].include.push(modelList[path.raw]);
					}
				} else if (path.type == "ComplexProperty") {
					let singular = this.changeModel2Singular(path.raw).name;
					let mainModel = this.changeModel2Singular((index == 0) ? this.options.mainModel : includesArray[i][index - 1].raw).name;
					let aliasName = this.getIncludeAliasName(mainModel, singular);
					let include = {
						model: this.schema[singular],
						as: aliasName.name,
						separate: aliasName.separate,
						required: false,
						nested: true,
						order: [['id', 'ASC']]
					};
					if (aliasName.through == true) include["through"] = {
						attributes: []
					}
					modelList[path.raw] = include;
					
					if (index != 0) {
						if (modelList[includesArray[i][index - 1].raw].include == undefined) modelList[includesArray[i][index - 1].raw].include = [];
						modelList[includesArray[i][index - 1].raw].include.push(modelList[path.raw]);
					}
				}
			};
		}

		let includes = _.uniq(modelRoot).map(model => modelList[model]);

	//	console.log("[[includes]]",includes.include[0].include[0])

		return includes;
    }

    protected VisitExpandItem(node: Token, context: any) {
    //	this.Visit(node.value.path, context);
		node.type = "QueryOptions";
		let options = {
			preModel: this.mainModel,
			...this.options
		}
		options.mainModel = context;
		let visitor = new Visitor(options).Visit(node);
		visitor.isInclude = true;
	//	if (node.value.options) visitor.VisitQueryOptions(node, context);
		return visitor;
    }

    protected VisitExpandPath(node: Token, context: any) {
		console.log("[[VisitExpandPath]]", JSON.stringify(node, undefined, "\t"));
		let pathArray = node.value.map(item => {
			return {
				type: item.type,
				raw: item.raw
			}
		});
        this.navigationProperty = node.raw;
		return pathArray;
    }

	protected VisitQueryOptions(node:Token, context:any){
		if (!node.value.options) return;
		node.value.options.forEach((option) => {
			let op:any = this.Visit(option, context);
			switch (option.type){
				case "Filter": this.where = op; break;
				case "OrderBy": this.order = op; break;
				case "Top": this.limit = op; break;
				case "Skip": this.offset = op; break;
				case "InlineCount": this.inlinecount = op; break;
				case "Select": this.attributes = op; break;
				case "Expand": this.include = op; break;
			//	case "Format": this.format = op; break;
			//	case "Count": this.count = op; break;
			//	case "Apply": this.apply = op; break;
			//	case "Search": this.search = op; break;
			//	case "Compute": this.compute = op; break;
			}
		//	return this.Visit(option, context);
		});
	}

	protected VisitInlineCount(node:Token, context:any){
		this.inlinecount = Literal.convert(node.value.value, node.value.raw);
	}

	protected VisitFilter(node:Token, context:any){
		context.target = "where";
		return this.Visit(node.value, context);
	//	if (!this.where) this.where[Op.and] = Sequelize.literal('(1 = 1)');
	}

	protected VisitOrderBy(node:Token, context:any){
		context.target = "orderby";
		let orderBy: Array<string> = node.value.items.map((item, i) => {
			return this.Visit(item, context);
		});
		return orderBy;
	}

	protected VisitOrderByItem(node:Token, context:any){
	//	this.Visit(node.value.expr, context);
		return node.raw.split(' ');
	}

	protected VisitSkip(node:Token, context:any){
		return Number(node.value.raw);
	}

	protected VisitTop(node:Token, context:any){
		return Number(node.value.raw);
	}

	protected VisitSelect(node:Token, context:any){
		context.target = "select";
		let attributes: Array<string> = node.value.items.map((item, i) => {
			return this.Visit(item, context);
		});
		return attributes;
	}

	protected VisitSelectItem(node:Token, context:any){
		let item = node.raw.replace(/\//g, '.');
		return `${item}`;
	}

	protected VisitAndExpression(node:Token, context:any){
		// return { [Op.and]: [] }
		let and: object = {};
		let left: object = this.Visit(node.value.left, context);
		let right: object = this.Visit(node.value.right, context);
		and[Op.and] = [left, right];
		return and;
	}

	protected VisitOrExpression(node:Token, context:any){
		let or:object = {};
		let left:object = this.Visit(node.value.left, context);
		let right:object = this.Visit(node.value.right, context);
		or[Op.or] = [left, right];
		return or;
	}

	protected VisitBoolParenExpression(node:Token, context:any){
		return this.Visit(node.value, context);
	}

	protected VisitCommonExpression(node:Token, context:any){
		return this.Visit(node.value, context);
	}

	protected VisitFirstMemberExpression(node:Token, context:any){
		return this.Visit(node.value, context);
	}

	protected VisitMemberExpression(node:Token, context:any){
		return this.Visit(node.value, context);
	}

	protected VisitPropertyPathExpression(node:Token, context:any){
		if (node.value.current && node.value.next){
			return `${this.Visit(node.value.current, context)}.${this.Visit(node.value.next, context)}`
		} else {
			return `${this.Visit(node.value, context)}`;
		}
	}

	protected VisitSingleNavigationExpression(node:Token, context:any){
		if (node.value.current && node.value.next) {
			return `${this.Visit(node.value.current, context)}.${this.Visit(node.value.next, context)}`
		} else {
			return `${this.Visit(node.value, context)}`;
		}
	}

	protected VisitODataIdentifier(node:Token, context:any){
		return `${node.value.name}`;
	}

	protected VisitEqualsExpression(node:Token, context:any){
		let eq:object = {};
		let left = this.Visit(node.value.left, context);
		eq[`${left}`] = {
			[Op.eq]: this.Visit(node.value.right, context)
		};
		return eq;
	}

	protected VisitNotEqualsExpression(node:Token, context:any){
		let ne: object = {};
		let left = this.Visit(node.value.left, context);
		ne[`${left}`] = {
			[Op.ne]: this.Visit(node.value.right, context)
		};
		return ne;
	}

	protected VisitLesserThanExpression(node:Token, context:any){
		let ne: object = {};
		let left = this.Visit(node.value.left, context);
		ne[`${left}`] = {
			[Op.ne]: this.Visit(node.value.right, context)
		};
		return ne;
	}

	protected VisitLesserOrEqualsExpression(node:Token, context:any){
		let lte: object = {};
		let left = this.Visit(node.value.left, context);
		lte[`${left}`] = {
			[Op.lte]: this.Visit(node.value.right, context)
		};
		return lte;
	}

	protected VisitGreaterThanExpression(node:Token, context:any){
		let gt: object = {};
		let left = this.Visit(node.value.left, context);
		gt[`${left}`] = {
			[Op.gt]: this.Visit(node.value.right, context)
		};
		return gt;
	}

	protected VisitGreaterOrEqualsExpression(node:Token, context:any){
		let gte: object = {};
		let left = this.Visit(node.value.left, context);
		gte[`${left}`] = {
			[Op.gte]: this.Visit(node.value.right, context)
		};
		return gte;
	}

	protected VisitLiteral(node:Token, context:any){
		let value = SQLLiteral.convert(node.value, node.raw);
		return value;
	}

	protected VisitMethodCallExpression(node:Token, context:any){
		var method = node.value.method;
		var params = node.value.parameters || [];
		let param1: any;
		switch (method){
			case "contains":
				let contains = {};
				param1 = this.Visit(params[0], context);
				contains[param1] = {};
				contains[param1][Op.contains] = this.Visit(params[1], context);
				return contains;
			case "endswith":
				let endswith = {};
				param1 = this.Visit(params[0], context);
				endswith[param1] = {};
				endswith[param1][Op.endsWith] = this.Visit(params[1], context);
				return endswith;
			case "startswith":
				let startswith = {};
				param1 = this.Visit(params[0], context);
				startswith[param1] = {};
				startswith[param1][Op.startsWith] = this.Visit(params[1], context);
				return startswith;
			case "indexof":
				break;
			case "round":
				break;
			case "length":
				break;
			case "tolower":
				break;
			case "toupper":
				break;
			case "floor":
				break;
			case "ceiling":
				break;
			case "year":
				break;
			case "month":
				break;
			case "day":
				break;
			case "hour":
				break;
			case "minute":
				break;
			case "second":
				break;
			case "now":
				break;
			case "trim":
				break;
		}
	}

}
