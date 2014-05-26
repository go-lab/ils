/*
ILS Library for Go-Lab
*/


(function() {
  var ils;

  ils = {
    getCurrentUser: function(cb) {
      var username = "";
      var error = {"error" : "Cannot get username"};
      username = $.cookie('graasp_user');
      if (username != undefined && username != null && username != "")
        return cb(username);
      else
        return cb(error);
    },
    getParent: function(cb) {
      var error = {"error" : "Connot get parent space"};
      osapi.context.get().execute(function(context_space) {
        if(context_space != undefined && context_space != null && !context_space.error){
          osapi.spaces.get({contextId: context_space.contextId}).execute(function(parent){
            if(!parent.error)
              return cb(parent);
            else
              return cb(error);
         });
        }else{
          return cb(error);
        }
      });
    },
    readResource: function(resourceId, cb) {
      var error = {};
      if(resourceId > 0){
        osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function(resource){
          if(!resource.error){
            // decode Base64 file: supported by chrome, firefox, safari, IE 10, opera
            resource["content"] = JSON.parse(window.atob(resource["data"]));
            ils.getIls(function(parentIls) {
              ils.getVault(function(vault) {
                // get the associated activity of this resource
                // e.g. student mario has added a concept map via the app Concept Mapper in ILS 1000 
                ils.getAction(vault.id, resourceId, function(action) {
                  var metadata = {};
                  metadata.actor = action.actor;
                  metadata.target = {
                    objectType: action.object.objectType,
                    id: action.object.id,
                    displayName: action.object.displayName
                  };
                  metadata.generator = {
                    objectType: action.generator.objectType,
                    url: action.generator.url,
                    id: action.generator.id,
                    displayName: action.generator.displayName
                  };
                  metadata.provider = {
                    url: parentIls.profileUrl,
                    id: parentIls.id,
                    displayName: parentIls.displayName
                  };
                  // append the metadata to the resource object
                  resource["metadata"] = metadata;
                  return cb(resource);
                });
              });
            });
          }else{
            error = {"error" : "Cannot get resource"};
            return cb(error);
          }
        });
      }else{
        error = {"error" : "resourceId cannot be 0 or negative"};
        return cb(error);
      }
    },

    createResource: function(resourceName, content, cb) {
      var error = {};
      if(resourceName != null && resourceName != undefined){
        ils.getVault(function(vault) {
          ils.getCurrentUser(function(username){
            var params = {
              "document": {
              "parentType": "@space",
              "parentId": vault.id,
              "displayName": resourceName,
              "mimeType": "txt",
              "fileName": resourceName,
              "content": JSON.stringify(content)
              }
            };
            osapi.documents.create(params).execute(function(resource){
              if(!resource.error && resource != null & resource != undefined){
                ils.getApp(function(app){
                  //log the action of adding this resource
                  ils.logAction(username, vault, resource.entry.id, app, function(response){
                    if(!response.error){
                      return cb(resource.entry);
                    }else{
                      return cb(response.error);
                    }
                  });
                });
              }
              else{
                error = {"error" : "Couldn't create resource"};
                return cb(error);
              }
            });
          });
        });
      }else{
        error = {"error" : "resourceName cannot be null. Cannot create resource."};
        return cb(error);
      }
    },
    listVault: function(cb) {
      var error = {"error" : "Cannot get the resources in the Vault"};
      ils.getVault(function(vault) {
        osapi.documents.get({contextId: vault.id, contextType: "@space"}).execute(function(resources){
          if(resources.list.length > 0) 
            return cb(resources.list);
          else
            return cb(error);
        });
      });
    },
    getIls: function(cb) {
      var error = {"error" : "Cannot get ILS"};
      osapi.context.get().execute(function(space) {
        if (!space.error) {
          console.log("print context");
          console.log(space);
          osapi.spaces.get({contextId: space.contextId}).execute(function (parentSpace) {
            if(!parentSpace.error){
              console.log("print parent space");
              console.log(parentSpace);
              osapi.spaces.get({contextId: parentSpace.parentId}).execute(function (parentIls){
                if(!parentIls.error && parentIls.spacetype === 'ils'){
                  console.log("print ils space");
                  console.log(parentIls);
                  return cb(parentIls, parentSpace);
                }else{
                  return cb(error);
                }
              });
            }else{
              return cb(error);
            }
          });
        }else{
          return cb(error);
        }
      });
    },
    getVault: function(cb) {
      var error = {};
      ils.getIls(function(parentIls) {
        if(!parentIls.error){
        console.log(parentIls.id);
        osapi.spaces.get({contextId: parentIls.id, contextType: "@space"}).execute(
          function(subspaces) {
            if(subspaces.totalResults != 0){
              var item, vault;
              vault = (function() {
                var i, len, ref, results;
                ref = subspaces.list;
                results = [];
                for (i = 0, len = ref.length; i < len; i++) {
                  item = ref[i];
                  if(JSON.parse(item.metadata) != null && JSON.parse(item.metadata) != undefined){
                    if (JSON.parse(item.metadata).type === "Vault") {
                      results.push(item);
                  }
                }
              }
              return results;
            })();
            return cb(vault[0]);
          }else{
            error = {"error" : "No subspaces in current ILS"};
            return cb(error);
          }
        });
      }else{
        error = {"error" : "Cannot get the vault"};
        return cb(error);
      }
    });
    },
    getApp: function(cb) {
      osapi.apps.get({contextId: "@self"}).execute(function(response){
        if (!response.error){
          return cb(response);
        }else{
          var error = {"error": "Cannot get app"};
          return cb(error);
        }
      });
    },
    logAction: function(userName, vault, resourceId, app, cb) {
      var params = {
        userId: "@viewer",
        groupId: "@self",
        activity: {
          verb: "add"
        }
      };
      params.activity.actor = {
        id: userName + "@" + vault.parentId.toString(), //the id of the ILS
        objectType: "person",
        name: userName
      };
      params.activity.object = {
        id: resourceId.toString(),
        objectType: "Asset",
        graasp_object: "true"
      };
      params.activity.target = {
        id: vault.id.toString(),
        objectType: "Space",
        graasp_object: "true"
      };
      params.activity.generator = {
        id: app.id.toString(),
        objectType: "Widget",
        ur: app.appUrl,
        graasp_object: "true"
      };
      osapi.activitystreams.create(params).execute(function(response){
        if (!response.error){
          return cb(response);
        }else{
          var error = {"error": "Cannot create activity"};
          return cb(error);
        }
      });
    },
    getAction: function(vaultId, resourceId, cb) {
      var params = {
        contextId: vaultId,
        contextType: "@space",
        count: 1,
        fields: "id,actor,verb,object,target,published,updated,generator",
        filterBy: "object.id",
        filterOp: "contains",
        filterValue: "assets/" + resourceId.toString(),
        ext: true
      };
      osapi.activitystreams.get(params).execute(function(response){
        if(!response.error && (response.totalResults > 0 )){
          return cb(response.entry[0]);
        }else{
          var error = {"error": "Cannot get activity"};
          return cb(error);
        }
      });
    },


    getParentInquiryPhase: function(cb) {
      var error = {"error" : "Cannot get parent inquiry phase"};
      this.getParent(function(parent) {
        if(!parent.error && parent.metadata != null && parent.metadata != undefined){
          return cb(JSON.parse(parent.metadata).type);
        }else{
          return cb(error);
        }
      });
    }
  };

  window.ils = ils;

}).call(this);