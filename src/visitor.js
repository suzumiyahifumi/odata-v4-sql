"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.Visitor = exports.SQLLang = exports.SQLLiteral = void 0;
var odata_v4_literal_1 = require("odata-v4-literal");
var sequelize_1 = require("sequelize");
var _ = require('lodash');
var SQLLiteral = /** @class */ (function (_super) {
    __extends(SQLLiteral, _super);
    function SQLLiteral() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SQLLiteral.convert = function (type, value) {
        return (new SQLLiteral(type, value)).valueOf();
    };
    SQLLiteral.prototype['Edm.String'] = function (value) { return "'" + decodeURIComponent(value).slice(1, -1).replace(/''/g, "'") + "'"; };
    SQLLiteral.prototype['Edm.Guid'] = function (value) { return "'" + decodeURIComponent(value) + "'"; };
    SQLLiteral.prototype['Edm.Date'] = function (value) { return "'" + value + "'"; };
    SQLLiteral.prototype['Edm.DateTimeOffset'] = function (value) { return "'" + value.replace("T", " ").replace("Z", " ").trim() + "'"; };
    SQLLiteral.prototype['Edm.Boolean'] = function (value) {
        value = value || '';
        switch (value.toLowerCase()) {
            case 'true': return 1;
            case 'false': return 0;
            default: return "NULL";
        }
    };
    SQLLiteral.prototype['null'] = function (value) { return "NULL"; };
    return SQLLiteral;
}(odata_v4_literal_1.Literal));
exports.SQLLiteral = SQLLiteral;
var SQLLang;
(function (SQLLang) {
    SQLLang[SQLLang["ANSI"] = 0] = "ANSI";
    SQLLang[SQLLang["MsSql"] = 1] = "MsSql";
    SQLLang[SQLLang["MySql"] = 2] = "MySql";
    SQLLang[SQLLang["PostgreSql"] = 3] = "PostgreSql";
    SQLLang[SQLLang["Oracle"] = 4] = "Oracle";
})(SQLLang = exports.SQLLang || (exports.SQLLang = {}));
var Visitor = /** @class */ (function () {
    function Visitor(options) {
        if (options === void 0) { options = {}; }
        this.isInclude = false;
        this.attributes = [];
        this.where = {};
        this.order = [['id', 'ASC']];
        this.include = [];
        this.parameters = new Map();
        this.parameterSeed = 0;
        this.mainModel = options.mainModel;
        this.preModel = options.preModel;
        this.options = options;
        this.schema = options.schema || {};
        if (this.options.useParameters != false)
            this.options.useParameters = true;
        this.type = options.type || SQLLang.ANSI;
        //	console.log('mainModel',this.mainModel)
    }
    Visitor.prototype.from = function () {
        var from_ = _.pick(this, ['where', 'order', 'offset', 'limit', 'include', 'attributes', 'model', 'as', 'separate', 'required', 'nested']);
        if (from_.attributes.length == 0) {
            console.log('[[isInclude]]', this.isInclude, '[[preModel]]', this.preModel, "[[mainModel]]", this.mainModel);
            var n = (this.isInclude == true) ? this.getIncludeAliasName(this.preModel, this.mainModel).name : this.changeModel2Singular(this.mainModel).name;
            console.log('[[n]]', n);
            from_.attributes = {
                include: [
                    [(this.isInclude == true) ? 'id' : sequelize_1.Sequelize.literal("\"".concat(n, "\".\"id\"")), '@iot_id']
                ],
                exclude: ['id']
            };
        }
        else if (from_.attributes.indexOf('id') >= 0) {
            console.log('[[mainModel]]', "".concat(this.changeModel2Singular(this.mainModel).name, ".id"));
            from_.attributes[from_.attributes.indexOf('id')] = ['id', '@iot_id'];
            var n = this.changeModel2Singular(this.mainModel).name;
            from_.attributes = {
                include: __spreadArray([
                    [sequelize_1.Sequelize.literal((n == null) ? 'id' : "".concat(n, ".id")), '@iot_id']
                ], from_.attributes, true),
                exclude: ['id']
            };
        }
        if (from_.include.length == 0)
            delete from_.include;
        //	from_.raw = true;
        return from_;
    };
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
    Visitor.prototype.asAnsiSql = function () {
        this.type = SQLLang.ANSI;
        //this.where = this.originalWhere || this.where;
        this.include.forEach(function (item) { return item.asAnsiSql(); });
        return this;
    };
    Visitor.prototype.asType = function () {
        switch (this.type) {
            //	case SQLLang.MsSql: return this.asMsSql();
            case SQLLang.ANSI:
            case SQLLang.MySql:
            case SQLLang.PostgreSql: return this.asAnsiSql();
            //	case SQLLang.Oracle: return this.asOracleSql();
            default: return this;
        }
    };
    Visitor.prototype.Visit = function (node, context) {
        this.ast = this.ast || node;
        context = context || { target: "where" };
        //	console.log(node)
        var visitor = this["Visit".concat(node.type)];
        var next = visitor.call(this, node, context);
        return (node == this.ast) ? this : next;
    };
    Visitor.prototype.changeModel2Singular = function (type) {
        var type2 = type.toLowerCase();
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
                } : (type2.split(".").length > 1) ? {
                    name: null,
                    nameOri: type,
                    isModel: true
                } : {
                    name: null,
                    nameOri: type,
                    isModel: false
                };
        }
    };
    Visitor.prototype.getIncludeAliasName = function (mainModel, expandModel) {
        var ex = expandModel.toLowerCase();
        var me = mainModel.toLowerCase();
        var map = {
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
                }, 'datastream': 'datastreams'
            },
            'locations': {
                'thing': {
                    name: 'things',
                    through: true,
                    separate: false
                }
            },
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
        };
        var re = (typeof map[me][ex] == 'string') ? { name: map[me][ex], through: false, separate: false } : map[me][ex];
        return re || {
            name: ex,
            through: false,
            separate: false
        };
    };
    Visitor.prototype.VisitODataUri = function (node, context) {
        this.Visit(node.value.resource, context);
        this.Visit(node.value.query, context);
    };
    Visitor.prototype.VisitExpand = function (node, context) {
        var _this = this;
        var modelList = {};
        var includesArray = node.value.items.map(function (item) {
            var pathArray = _this.Visit(item.value.path);
            var m = pathArray[pathArray.length - 1].raw;
            var singular = _this.changeModel2Singular(m).name;
            var mainModel = _this.changeModel2Singular((pathArray.length > 1) ? pathArray[pathArray.length - 2].raw : _this.options.mainModel).name;
            var aliasName = _this.getIncludeAliasName(mainModel, singular);
            var include = __assign({ model: _this.schema[singular], as: aliasName.name, separate: aliasName.separate, required: false, nested: true }, _this.Visit(item, singular).from());
            if (aliasName.through == true)
                include.through = {
                    attributes: []
                };
            modelList[m] = include;
            pathArray[pathArray.length - 1].include = include;
            return pathArray;
        }).sort(function (a, b) {
            return a.length - b.length;
        });
        var modelRoot = [];
        for (var i = 0; i < includesArray.length; i++) {
            for (var index = 0; index < includesArray[i].length; index++) {
                var path = includesArray[i][index];
                if (index == 0)
                    modelRoot.push(path.raw);
                if (modelList[path.raw]) {
                    if (index != 0) {
                        if (modelList[includesArray[i][index - 1].raw].include == undefined)
                            modelList[includesArray[i][index - 1].raw].include = [];
                        modelList[includesArray[i][index - 1].raw].include.push(modelList[path.raw]);
                    }
                }
                else if (path.type == "ComplexProperty") {
                    var singular = this.changeModel2Singular(path.raw).name;
                    var mainModel = this.changeModel2Singular((index == 0) ? this.options.mainModel : includesArray[i][index - 1].raw).name;
                    var aliasName = this.getIncludeAliasName(mainModel, singular);
                    var include = {
                        model: this.schema[singular],
                        as: aliasName.name,
                        separate: aliasName.separate,
                        required: false,
                        nested: true,
                        order: [['id', 'ASC']]
                    };
                    if (aliasName.through == true)
                        include["through"] = {
                            attributes: []
                        };
                    modelList[path.raw] = include;
                    if (index != 0) {
                        if (modelList[includesArray[i][index - 1].raw].include == undefined)
                            modelList[includesArray[i][index - 1].raw].include = [];
                        modelList[includesArray[i][index - 1].raw].include.push(modelList[path.raw]);
                    }
                }
            }
            ;
        }
        var includes = _.uniq(modelRoot).map(function (model) { return modelList[model]; });
        //	console.log("[[includes]]",includes.include[0].include[0])
        return includes;
    };
    Visitor.prototype.VisitExpandItem = function (node, context) {
        //	this.Visit(node.value.path, context);
        node.type = "QueryOptions";
        var options = __assign({ preModel: this.mainModel }, this.options);
        options.mainModel = context;
        var visitor = new Visitor(options).Visit(node);
        visitor.isInclude = true;
        //	if (node.value.options) visitor.VisitQueryOptions(node, context);
        return visitor;
    };
    Visitor.prototype.VisitExpandPath = function (node, context) {
        console.log("[[VisitExpandPath]]", JSON.stringify(node, undefined, "\t"));
        var pathArray = node.value.map(function (item) {
            return {
                type: item.type,
                raw: item.raw
            };
        });
        this.navigationProperty = node.raw;
        return pathArray;
    };
    Visitor.prototype.VisitQueryOptions = function (node, context) {
        var _this = this;
        if (!node.value.options)
            return;
        node.value.options.forEach(function (option) {
            var op = _this.Visit(option, context);
            switch (option.type) {
                case "Filter":
                    _this.where = op;
                    break;
                case "OrderBy":
                    _this.order = op;
                    break;
                case "Top":
                    _this.limit = op;
                    break;
                case "Skip":
                    _this.offset = op;
                    break;
                case "InlineCount":
                    _this.inlinecount = op;
                    break;
                case "Select":
                    _this.attributes = op;
                    break;
                case "Expand":
                    _this.include = op;
                    break;
                //	case "Format": this.format = op; break;
                //	case "Count": this.count = op; break;
                //	case "Apply": this.apply = op; break;
                //	case "Search": this.search = op; break;
                //	case "Compute": this.compute = op; break;
            }
            //	return this.Visit(option, context);
        });
    };
    Visitor.prototype.VisitInlineCount = function (node, context) {
        this.inlinecount = odata_v4_literal_1.Literal.convert(node.value.value, node.value.raw);
    };
    Visitor.prototype.VisitFilter = function (node, context) {
        context.target = "where";
        return this.Visit(node.value, context);
        //	if (!this.where) this.where[Op.and] = Sequelize.literal('(1 = 1)');
    };
    Visitor.prototype.VisitOrderBy = function (node, context) {
        var _this = this;
        context.target = "orderby";
        var orderBy = node.value.items.map(function (item, i) {
            return _this.Visit(item, context);
        });
        return orderBy;
    };
    Visitor.prototype.VisitOrderByItem = function (node, context) {
        //	this.Visit(node.value.expr, context);
        return node.raw.split(' ');
    };
    Visitor.prototype.VisitSkip = function (node, context) {
        return Number(node.value.raw);
    };
    Visitor.prototype.VisitTop = function (node, context) {
        return Number(node.value.raw);
    };
    Visitor.prototype.VisitSelect = function (node, context) {
        var _this = this;
        context.target = "select";
        var attributes = node.value.items.map(function (item, i) {
            return _this.Visit(item, context);
        });
        return attributes;
    };
    Visitor.prototype.VisitSelectItem = function (node, context) {
        var item = node.raw.replace(/\//g, '.');
        return "".concat(item);
    };
    Visitor.prototype.VisitAndExpression = function (node, context) {
        // return { [Op.and]: [] }
        var and = {};
        var left = this.Visit(node.value.left, context);
        var right = this.Visit(node.value.right, context);
        and[sequelize_1.Op.and] = [left, right];
        return and;
    };
    Visitor.prototype.VisitOrExpression = function (node, context) {
        var or = {};
        var left = this.Visit(node.value.left, context);
        var right = this.Visit(node.value.right, context);
        or[sequelize_1.Op.or] = [left, right];
        return or;
    };
    Visitor.prototype.VisitBoolParenExpression = function (node, context) {
        return this.Visit(node.value, context);
    };
    Visitor.prototype.VisitCommonExpression = function (node, context) {
        return this.Visit(node.value, context);
    };
    Visitor.prototype.VisitFirstMemberExpression = function (node, context) {
        return this.Visit(node.value, context);
    };
    Visitor.prototype.VisitMemberExpression = function (node, context) {
        return this.Visit(node.value, context);
    };
    Visitor.prototype.VisitPropertyPathExpression = function (node, context) {
        if (node.value.current && node.value.next) {
            return "".concat(this.Visit(node.value.current, context), ".").concat(this.Visit(node.value.next, context));
        }
        else {
            return "".concat(this.Visit(node.value, context));
        }
    };
    Visitor.prototype.VisitSingleNavigationExpression = function (node, context) {
        if (node.value.current && node.value.next) {
            return "".concat(this.Visit(node.value.current, context), ".").concat(this.Visit(node.value.next, context));
        }
        else {
            return "".concat(this.Visit(node.value, context));
        }
    };
    Visitor.prototype.VisitODataIdentifier = function (node, context) {
        return "".concat(node.value.name);
    };
    Visitor.prototype.VisitEqualsExpression = function (node, context) {
        var _a;
        var eq = {};
        var left = this.Visit(node.value.left, context);
        eq["".concat(left)] = (_a = {},
            _a[sequelize_1.Op.eq] = this.Visit(node.value.right, context),
            _a);
        return eq;
    };
    Visitor.prototype.VisitNotEqualsExpression = function (node, context) {
        var _a;
        var ne = {};
        var left = this.Visit(node.value.left, context);
        ne["".concat(left)] = (_a = {},
            _a[sequelize_1.Op.ne] = this.Visit(node.value.right, context),
            _a);
        return ne;
    };
    Visitor.prototype.VisitLesserThanExpression = function (node, context) {
        var _a;
        var ne = {};
        var left = this.Visit(node.value.left, context);
        ne["".concat(left)] = (_a = {},
            _a[sequelize_1.Op.ne] = this.Visit(node.value.right, context),
            _a);
        return ne;
    };
    Visitor.prototype.VisitLesserOrEqualsExpression = function (node, context) {
        var _a;
        var lte = {};
        var left = this.Visit(node.value.left, context);
        lte["".concat(left)] = (_a = {},
            _a[sequelize_1.Op.lte] = this.Visit(node.value.right, context),
            _a);
        return lte;
    };
    Visitor.prototype.VisitGreaterThanExpression = function (node, context) {
        var _a;
        var gt = {};
        var left = this.Visit(node.value.left, context);
        gt["".concat(left)] = (_a = {},
            _a[sequelize_1.Op.gt] = this.Visit(node.value.right, context),
            _a);
        return gt;
    };
    Visitor.prototype.VisitGreaterOrEqualsExpression = function (node, context) {
        var _a;
        var gte = {};
        var left = this.Visit(node.value.left, context);
        gte["".concat(left)] = (_a = {},
            _a[sequelize_1.Op.gte] = this.Visit(node.value.right, context),
            _a);
        return gte;
    };
    Visitor.prototype.VisitLiteral = function (node, context) {
        var value = SQLLiteral.convert(node.value, node.raw);
        return value;
    };
    Visitor.prototype.VisitMethodCallExpression = function (node, context) {
        var method = node.value.method;
        var params = node.value.parameters || [];
        var param1;
        switch (method) {
            case "contains":
                var contains = {};
                param1 = this.Visit(params[0], context);
                contains[param1] = {};
                contains[param1][sequelize_1.Op.contains] = this.Visit(params[1], context);
                return contains;
            case "endswith":
                var endswith = {};
                param1 = this.Visit(params[0], context);
                endswith[param1] = {};
                endswith[param1][sequelize_1.Op.endsWith] = this.Visit(params[1], context);
                return endswith;
            case "startswith":
                var startswith = {};
                param1 = this.Visit(params[0], context);
                startswith[param1] = {};
                startswith[param1][sequelize_1.Op.startsWith] = this.Visit(params[1], context);
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
    };
    return Visitor;
}());
exports.Visitor = Visitor;
