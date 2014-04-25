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
      osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function(resource){
        // decode Base64 file: supported by chrome, firefox, safari, IE 10, opera
        resource["content"] = JSON.parse(window.atob(resource["data"]));
        return cb(resource);
      });
    },
    createResource: function(resourceName, content, cb) {
      ils.getVault(function(vault) {
        ils.getCurrentUser(function(username){
          var params = {
            "document": {
              "parentType": "@space",
              "parentId": vault.id,
              "displayName": resourceName,
              "mimeType": "txt",
              "fileName": resourceName,
              "metadata": "{\"username\": \"" + username + "\"}",
              "content": JSON.stringify(content)
            }
          };
          osapi.documents.create(params).execute(function(resource){
            cb(resource.entry);
          });
        });
      });
    },
    listVault: function(cb) {
      ils.getVault(function(vault) {
        osapi.documents.get({contextId: vault.id, contextType: "@space"}).execute(function(resources){
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