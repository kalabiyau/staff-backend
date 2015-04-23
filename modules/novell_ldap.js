var ldap = require('ldapjs');
var fs = require('fs');
var _ = require('underscore');

var Employee = require('../models/employee');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'))
var ldap_server = config.novell_ldap_server
var searchBase = 'o=Novell';

var client = ldap.createClient({
  url: ldap_server
});

client.setMaxListeners(10);

exports.findById = function (id, callback) {
  var opts = {
    filter: "(WORKFORCEID=" + id + ")",
    scope: 'one'
  };

  client.on('error', function(err) {
    console.log('ERROR:' + err);
  });

  client.search(searchBase, opts, function(req, res) {
    var employee = null;

    res.on('searchEntry', function (entry) {
      var object = entry.object

      employee = {
        id: object.WORKFORCEID,
        title: object.title,
        department: object.ou,
        mobile: object.mobile,
        phone: object.telephoneNumber,
        managerid: object.MANAGERWORKFORCEID,
        manager: (entry.object.ISMANAGER == "TRUE")
      }
    });

    res.on('end', function(result) {
      callback(employee);
    });
  })
}

exports.team = function(request, response) {
  var managerid = request.params.id;

  var opts = {
    filter: '(|(WORKFORCEID=' + managerid + ')(MANAGERWORKFORCEID=' + managerid + '))',
    scope: 'sub'
  };

  client.on('error', function(err) {
    console.log('ERROR:' + err);
  });

  client.search(searchBase, opts, function(req, res, next) {
    var employees = [];

    res.on('searchEntry', function (entry) {
      var object = entry.object;

      employee = new Employee({
        id: object.WORKFORCEID,
        uid: object.uid.toLowerCase(),
        cn: object.FULLNAME,
        title: object.title,
        mail: object.mail,
        mobile: object.mobile,
        telephoneNumber: object.telephoneNumber,
        isManager: (object.ISMANAGER == "TRUE")
      })

      employees.push(employee)
    });

    res.on('end', function(result) {
      employees = _.sortBy(employees, function (o) {
        return (o.id == managerid ? 'a_' : 'b_') +  o.name;
      });

      response.send(employees);
    });
  })
};


