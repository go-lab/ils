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
    // getIls: function(cb) {
    //   return osapi.context.get().execute(function(space) {
    //     return osapi.spaces.get({
    //       contextId: space.contextId
    //     }).execute(function(parentSpace) {
    //       return osapi.spaces.get({
    //         contextId: parentSpace.parentId
    //       }).execute(function(parentIls) {
    //         return cb(parentIls);
    //       });
    //     });
    //   });
    // },
    getIls: function(cb) {
      osapi.context.get().execute(function(space) {
        if (!space.error) {
          console.log("print context");
          console.log(space);
          osapi.spaces.get({contextId: space.contextId}).execute(function (parentSpace) {
            if(!parentSpace.error){
              console.log("print parent space");
              console.log(parentSpace);
              osapi.spaces.get({contextId: parentSpace.parentId}).execute(function (parentIls){
                if(!parentIls.error){
                  console.log("print ils space");
                  console.log(parentIls);
                  return cb(parentIls);
                }
              });
            }
          });
        }
      });
    },
    getVault: function(cb) {
      return ils.getIls(function(parentIls) {
        console.log(parentIls.id);
        return osapi.spaces.get({
          contextId: parentIls.id,
          contextType: "@space"
        }).execute(function(subspaces) {
          var item, vault;
          vault = (function() {
            var _i, _len, _ref, _results;
            _ref = subspaces.list;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              item = _ref[_i];
              if (JSON.parse(item.metadata).type === "Vault") {
                _results.push(item);
              }
            }
            return _results;
          })();
          return cb(vault[0]);
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
    },
    getActionLogger: function(metadataHandler, cb) {
      return cb(new ut.commons.actionlogging.ActionLogger(metaDataHandler));
    },
    getNotificationClient: function(cb) {
      return osapi.context.get().execute(space)(function() {
        return cb(new ude.commons.NotificationClient(space.id));
      });
    }
  };

  window.ils = ils;

}).call(this);
