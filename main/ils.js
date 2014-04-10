/*
ILS Library for Go-Lab
*/


(function() {
  var ils;

  ils = {
    getCurrentUser: function(cb) {
      var username = "";
      username = $.cookie('graasp_user');
      return cb(username);
    },
    getParent: function(cb) {
      osapi.context.get().execute(function(context_space) {
        osapi.spaces.get({contextId: context_space.contextId}).execute(function(parent){
          return cb(parent);
        });
      });
    },
    readResource: function(resourceId, cb) {
      osapi.documents.get({contextId: resourceId}).execute(function(resource){
        return cb(resource);
      });
    },
    createResource: function() {},
    listVault: function(cb) {
      ils.getVault(function(vault) {
        osapi.documents.get({contextId: vault.id, contextType: "@space"}).execute(function(resources){
          console.log("print resources");
          return cb(resources.list);
        });
      });
    },
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
        return cb(JSON.parse(parent.metadata).type);
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
