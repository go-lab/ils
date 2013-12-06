/*
ILS Library for Go-Lab
*/


(function() {
  var ils;

  ils = {
    getCurrentUser: function(cb) {
      var username;
      username = $.cookie('user_name');
      return this.getIls(function(ils) {
        return osapi.appdata.get({
          userId: prefixContextId,
          keys: ["users"]
        }).execute(function(allUsers) {
          var userId;
          userId = _.filter(allUsers, username);
          return osapi.people.get({
            userId: userId
          }).execute(function(user) {
            return cb(user);
          });
        });
      });
    },
    getParent: function(cb) {
      return osapi.context.get().execute(function(space) {
        return osapi.spaces.get({
          contextId: space.id
        }).execute(function(parent) {
          return cb(parent);
        });
      });
    },
    readVault: function(docId, cb) {
      return osapi.documents.get({
        contextId: docId,
        size: "-1"
      }).execute(function(document) {
        return cb(document);
      });
    },
    createVault: function() {},
    listVault: function(cb) {
      return getVault(function(vault) {
        return osapi.documents.get({
          contextId: vault.id,
          contextType: "@space"
        }).execute(function(documents) {
          return cb(documents);
        });
      });
    },
    getIls: function(cb) {
      return osapi.context.get().execute(function(space) {
        return osapi.spaces.get({
          contextId: space.id
        }).execute(function(parentSpace) {
          return osapi.spaces.get({
            contextId: parentSpace.parentId
          }).execute(function(ils) {
            return cb(ils);
          });
        });
      });
    },
    getParentInquiryPhase: function(cb) {
      return this.getParent(function(parent) {
        return cb(parent.metadata.type);
      });
    },
    getParentInquiryPhase: function(cb) {
      return osapi.context.get().execute(function(space) {
        return osapi.spaces.get({
          contextId: space.id
        }).execute(function(parent) {
          return cb(parent.metadata.type);
        });
      });
    }
  };

  window.ils = ils;

}).call(this);
