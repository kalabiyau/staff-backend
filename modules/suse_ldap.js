var ldap = require('ldapjs');
var fs = require('fs');
var _ = require('underscore');

var Employee = require('../models/employee');

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'))
var ldap_server = config.suse_ldap_server
var searchBase = 'ou=people,dc=suse,dc=de';

var client = ldap.createClient({
  url: ldap_server
});


exports.findAll = function (request, response) {
  var search = request.query.search
  if(search) {
    exports._search(request, response)
  } else {
    exports._all(request, response)
  }
};


exports._all = function (request, response) {
  console.log("*** _all =>" + JSON.stringify(request.query))
  var opts = {
    filter:'(!(ou=people))',
    scope: 'sub'
  };

  exports._query(opts, request, response)
};


exports._search = function (request, response) {
  console.log("*** search =>" + JSON.stringify(request.query))

  var search = request.query.search
  var opts = {
    scope: 'sub',
    filter: '(|(givenName=*' + search + '*)(sn=*' + search + '*)(uid=*' + search + '*)(mail=*' + search + '*))'
  };

  exports._query(opts, request, response)

};


exports._query = function (opts, request, response) {
  var page = parseInt(request.query.page) || 0
  var limit = parseInt(request.query.limit) || 20
  var start = page * limit;
  var end = start + limit;

  client.search(searchBase, opts, function(req, res) {
    var staff = [];

    res.on('searchEntry', function (entry) {
      staff.push(entry.object)
    });

    res.on('end', function(result) {
      var employees = []
      staff = _.sortBy(staff, 'cn').slice(start, end);
      for(i in staff) { employees.push(new Employee(staff[i])) }
      response.send(employees);
    });
  })

}

exports.findById = function (id, callback) {
  var opts = {
    filter: "(employeeNumber=" + id + ")",
    scope: 'one'
  };

  client.search(searchBase, opts, function(req, res) {
    var employee = null;

    res.on('searchEntry', function (entry) {
      employee = entry.object
    });

    res.on('end', function(result) {
      callback(new Employee(employee));
    });
  })
}

exports.latest = function(request, response) {
  client.search(searchBase, { scope: 'sub', filter:'(!(ou=people))' }, function(req, res, next) {
    var staff = [];

    res.on('searchEntry', function (entry) {
      staff.push(entry.object)
    });

    res.on('end', function(result) {
      var employees = []

      staff = _.sortBy(staff, 'suseid').reverse().slice(0,50)

      for(i in staff) {
        employees.push(new Employee(staff[i]))
      }

      response.send(employees);
    });
  })
};

exports.count = function (request, response) {
  client.search(searchBase, {attributes: 'id', scope: 'sub'}, function (req, res, next) {
    var count = 0;

    res.on('searchEntry', function (entry) {
      count++;
    });

    res.on('end', function (result) {
      response.send({count: count});
    });
  })
};



