"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _pluralize = require("pluralize");

var _pluralize2 = _interopRequireDefault(_pluralize);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**@param {Obejct} config
 * {
 *    client : RedisClient,
 *    db : dbName,
 *    table : tableName,
 *    schema : {
 *      columnName : { type : "number", }
 *    },
 *    relations : {
 *      hasMany : [],
 *      belongsTo : []
 *    }
 * }
 */

var Model = function () {
  function Model(config) {
    _classCallCheck(this, Model);

    this.client = config.client;
    this.db = config.db;
    this.table = config.table;
    this.config = config;
  }

  _createClass(Model, [{
    key: "make",
    value: function make(params) {
      var instance = new Instance(this.config, params);
      return instance;
    }
  }, {
    key: "find",
    value: function find(id) {
      var _this = this;

      var promise = this.client.hgetAsync(this.db + ":" + this.table, id).then(function (paramsJSON) {
        if (paramsJSON) return new Instance(_this.config, JSON.parse(paramsJSON));
        return null;
      });
      return promise;
    }
  }, {
    key: "findBy",
    value: function findBy(column, value) {
      var _this2 = this;

      var promise = this.client.hgetallAsync(this.db + ":" + this.table).then(function (hashMap) {
        var ids = Object.keys(hashMap);
        var id = void 0,
            params = void 0;
        for (var i = 0; i < ids.length; i++) {
          id = ids[i];
          params = JSON.parse(hashMap[id]);
          if (params[column] === value) return new Instance(_this2.config, params);
        }
      });
      return promise;
    }
  }, {
    key: "findAllBy",
    value: function findAllBy(column, value) {
      var condition = function (column, value, params) {
        return params[column] === value;
      }.bind(this, column, value);
      var promise = this.where(condition);
      return promise;
    }
  }, {
    key: "where",
    value: function where(condition) {
      var _this3 = this;

      var promise = this.client.hgetallAsync(this.db + ":" + this.table).then(function (hashMap) {
        var ids = Object.keys(hashMap);
        var instances = [];
        var id = void 0,
            params = void 0,
            instance = void 0;
        for (var i = 0; i < ids.length; i++) {
          id = ids[i];
          params = JSON.parse(hashMap[id]);
          if (condition(params)) {
            instance = new Instance(_this3.config, params);
            instances.push(instance);
          }
        }
        return instances;
      });
      return promise;
    }
  }]);

  return Model;
}();

exports.default = Model;

var Instance = function () {
  function Instance(config, params) {
    _classCallCheck(this, Instance);

    this.client = config.client;
    this.db = config.db;
    this.table = config.table;
    if (config.schema) this._setSchema(config.schema);
    if (config.relations) this._setRelations(config.relations);

    this.params = params || {};
  }

  _createClass(Instance, [{
    key: "_setSchema",
    value: function _setSchema() {
      var schema = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    }
  }, {
    key: "_setRelations",
    value: function _setRelations() {
      var relations = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (!!relations.hasMany) this.setHasMany(relations.hasMany);
      if (!!relations.belongsTo) this.setBelongsTo(relations.belongsTo);
    }
  }, {
    key: "_setHasMany",
    value: function _setHasMany(ChildList) {
      var _this4 = this;

      ChildList.forEach(function (Child) {
        var childrenKey = _pluralize2.default.plural(Child.table);
        _this4[childrenKey] = _this4._findChildren.bind(_this4, Child);
      });
    }
  }, {
    key: "_setBelongsTo",
    value: function _setBelongsTo(ParentList) {
      var _this5 = this;

      ParentList.forEach(function (Parent) {
        var parentKey = Parent.table;
        _this5[parentKey] = _this5._findParent.bind(_this5, Parent);
      });
    }
  }, {
    key: "_findChildren",
    value: function _findChildren(Child) {
      var column = this.table + "_id";
      var value = this.params.id;
      var promise = Child.findAllBy(column, value);
      return promise;
    }
  }, {
    key: "_findParent",
    value: function _findParent(Parent) {
      var column = Parent.table + "_id";
      var promise = Parent.find(this.params[column]);
      return promise;
    }
  }, {
    key: "setParams",
    value: function setParams() {
      var paramsChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      this.params = Object.assign(this.params, paramsChange);
      return this;
    }
  }, {
    key: "save",
    value: function save() {
      var _this6 = this;

      var promise = void 0;
      //TODO: validate params by schema
      if (this.params.id && this.params) {
        promise = this.client.hsetAsync(this.db + ":" + this.table, this.params.id, this.params);
      } else if (this.params) {
        promise = this.client.incrAsync("count@" + this.db + ":" + this.table).then(function (id) {
          _this6.setParams({ id: id });
          return _this6.client.hsetAsync(_this6.db + ":" + _this6.table, _this6.params.id, JSON.stringify(_this6.params));
        });
      } else {
        promise = _bluebird2.default.reject("params is not defined");
      }
      return promise;
    }
  }]);

  return Instance;
}();

module.exports = exports["default"];