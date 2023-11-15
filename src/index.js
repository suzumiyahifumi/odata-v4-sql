"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
exports.__esModule = true;
exports.createFilter = exports.createQuery = exports.SQLLang = void 0;
var visitor_1 = require("./visitor");
var visitor_2 = require("./visitor");
__createBinding(exports, visitor_2, "SQLLang");
var odata_v4_parser_1 = require("odata-v4-parser");
function createQuery(odataQuery, options, type) {
    if (options === void 0) { options = {}; }
    if (typeof type != "undefined" && type)
        options.type = type;
    var ast = (typeof odataQuery == "string" ? (0, odata_v4_parser_1.query)(odataQuery) : odataQuery);
    return new visitor_1.Visitor(options).Visit(ast);
}
exports.createQuery = createQuery;
function createFilter(odataFilter, options, type) {
    if (options === void 0) { options = {}; }
    if (typeof type != "undefined" && type)
        options.type = type;
    var ast = (typeof odataFilter == "string" ? (0, odata_v4_parser_1.filter)(odataFilter) : odataFilter);
    return new visitor_1.Visitor(options).Visit(ast);
}
exports.createFilter = createFilter;
