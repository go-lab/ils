/*
ILS Library for Go-Lab
author: Na Li, Wissam Halimi
contact: na.li@epfl.ch
*/


(function() {
  var ils;

  ils = {
    // get the nickname of the student who is currently using the ils
    getCurrentUser: function(cb) {
      var username = "";
      var error = {"error" : "Cannot get username"};
      username = $.cookie('graasp_user');
      if (username != undefined && username != null && username != "")
        return cb(username);
      else
        return cb(error);
    },

    // get the parent space of the widget 
    getParent: function(cb) {
      var error = {"error" : "Connot get parent space"};
      osapi.context.get().execute(function(context_space) {
        if (context_space != undefined && context_space != null && !context_space.error) {
          osapi.spaces.get({contextId: context_space.contextId}).execute(function(parent){
            if (!parent.error)
              return cb(parent);
            else
              return cb(error);
         });
        } else {
          return cb(error);
        }
      });
    },

    // read a resource by the resourceId, the result is the combination of resource content and the metadata
    readResource: function(resourceId, callback) {
      var error = {};
      if (resourceId > 0) {
        osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function(result){
          if (!result.error) {
              console.log("osapi returned resource:");
              console.log(result);

              // building the resource:
              var resource = {};
              resource.id = result.id;
              resource.published = result.updated;
              resource.metadata = JSON.parse(result.metadata);
              // decode Base64 file: supported by chrome, firefox, safari, IE 10, opera
              resource.content = JSON.parse(window.atob(result.data));
              callback(null, resource);
          } else {
            return callback({"error" : "Cannot get resource"});
          }
        });
      } else {
        return callback({"error" : "resourceId cannot be 0 or negative"});
      }
    },

    // create a resource in the Vault, resourceName and content need to be passed
    // resourceName should be in string format, content should be in JSON format
    createResource: function(resource, callback) {
      var error = {};
      console.log("trying to save resource: ");
      console.log(resource);
      if (resource != null && resource != undefined) {
        ils.getVault(function(vault) {
            var params = {
              "document": {
                  "parentType": "@space",
                  "parentId": vault.id,
                  "displayName": resource.metadata.target.displayName,
                  "mimeType": "text/plain",
                  "fileName": resource.metadata.target.displayName,
                  "metadata": JSON.stringify(resource.metadata),
                  "content": JSON.stringify(resource.content)
              }
            };
            osapi.documents.create(params).execute(function(result){
              console.log("Returning from osapi:");
              console.log(result)
              if (!result.error && result != null && result != undefined) {
                callback(null, result);
              } else {
                error = {"error": "Couldn't create resource"};
                return callback(error);
              }
            });
        });
      } else {
        error = {"error": "Resource cannot be null. Cannot create resource."};
        return callback(error);
      }
    },

    // get a list of all resources' metadata in the Vault
    listVault: function(callback) {
      ils.getVault(function(vault) {
        osapi.documents.get({contextId: vault.id, contextType: "@space"}).execute(function(resources){
          console.log("osapi returned:");
          console.log(resources);
          if (resources.list.length > 0) {
              metadatas = [];
              for (var i = 0; i < resources.list.length; i++) {
                  var entry = {};
                  entry.metadata = JSON.parse(resources.list[i].metadata);
                  entry.id = resources.list[i].id;
                  metadatas.push(entry);
              }
              return callback(null, metadatas);
          } else {
              return callback({"error" : "Cannot get the resources in the Vault"});
          }
        });
      });
    },

    // get the current ILS of the app
    getIls: function(cb) {
      var error = {"error" : "Cannot get ILS"};
      osapi.context.get().execute(function(space) {
        if (!space.error) {
          console.log("print context");
          console.log(space);
          osapi.spaces.get({contextId: space.contextId}).execute(function (parentSpace) {
            if (!parentSpace.error) {
              console.log("print parent space");
              console.log(parentSpace);
              osapi.spaces.get({contextId: parentSpace.parentId}).execute(function (parentIls){
                if (!parentIls.error && parentIls.spacetype === 'ils') {
                  console.log("print ils space");
                  console.log(parentIls);
                  return cb(parentIls, parentSpace);
                } else {
                  return cb(error);
                }
              });
            } else {
              return cb(error);
            }
          });
        } else {
          return cb(error);
        }
      });
    },

    // get the Vault of the current ILS
    getVault: function(cb) {
      var error = {};
      ils.getIls(function(parentIls) {
        if (!parentIls.error) {
        console.log(parentIls.id);
        osapi.spaces.get({contextId: parentIls.id, contextType: "@space"}).execute(
          function(subspaces) {
            if (subspaces.totalResults != 0) {
              var item, vault;
              vault = (function() {
                var i, len, ref, results;
                ref = subspaces.list;
                results = [];
                for (i = 0, len = ref.length; i < len; i++) {
                  item = ref[i];
                  if (JSON.parse(item.metadata) != null && JSON.parse(item.metadata) != undefined) {
                    if (JSON.parse(item.metadata).type === "Vault") {
                      results.push(item);
                  }
                }
              }
              return results;
            })();
            return cb(vault[0]);
          } else {
            error = {"error" : "No subspaces in current ILS"};
            return cb(error);
          }
        });
      } else {
        error = {"error" : "Cannot get the vault"};
        return cb(error);
      }
    });
    },

    // get the info of the current app
    getApp: function(cb) {
      osapi.apps.get({contextId: "@self"}).execute(function(response){
        if (!response.error) {
          return cb(response);
        } else {
          var error = {"error": "Cannot get app"};
          return cb(error);
        }
      });
    },

  // get the type of inquiry phase where the app is running in
    getParentInquiryPhase: function(cb) {
      var error = {"error" : "Cannot get parent inquiry phase"};
      this.getParent(function(parent) {
        if (!parent.error && parent.metadata != null && parent.metadata != undefined) {
          return cb(JSON.parse(parent.metadata).type);
        } else {
          return cb(error);
        }
      });
    }
  };

  window.ils = ils;

}).call(this);