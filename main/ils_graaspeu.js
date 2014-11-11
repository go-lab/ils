/*
ILS Library for Go-Lab
author: Na Li, Wissam Halimi, María Jesús Rodríguez-Triana
contact: maria.rodrigueztriana@epfl.ch
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
      var error = {"error" : "Cannot get parent space"};
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

    // delete a resource by the resourceId, the result is true if the resource has been successfully deleted
    deleteResource: function(resourceId, cb) {
      var error = {};
      if (resourceId && resourceId != "") {
        ils.getVault(function(vault) {
          ils.getCurrentUser(function(username) {
            osapi.documents.delete({contextId: resourceId}).execute(function (deleteResponse) {
              if (deleteResponse && !deleteResponse.error) {
                ils.getApp(function (app) {
                  //log the action of adding this resource
                  ils.logAction(username, vault, resourceId, app, "remove", function (logResponse) {
                    if (!logResponse.error) {
                      return cb(true);
                    } else {
                      error = {"error": "The resource removal couldn't be logged"};
                      return cb(error);
                    }
                  });
                });
              } else {
                error = {"error": "Couldn't remove resource"};
                return cb(error);
              }
            });
          });
        });
      } else {
        error = {"error" : "resourceId cannot be empty"};
        return cb(error);
      }
    },

    // verifies whether there is a resource by the resourceId, the result is true/false
    existResource: function(resourceId, cb) {
      var error = {};
      if (resourceId && resourceId != "") {
        osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function(resource){
          if (resource && !resource.error && resource.url) {
            return cb(true);
          } else {
            return cb(false);
          }
        });
      } else {
        error = {"error" : "resourceId cannot be empty"};
        return cb(error);
      }
    },

    // read a resource by the resourceId, the result is the combination of resource content and the metadata
    readResource: function(resourceId, cb) {
      var error = {};
      if (resourceId && resourceId != "") {
        osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function(resource){
          if (!resource.error && resource.id) {
            ils.getIls(function(parentIls) {
              ils.getVault(function(vault) {
                // get the associated activity of this resource
                // e.g. student mario has added a concept map via the app Concept Mapper in ILS 1000
                ils.getAction(vault.id, resourceId, function(action) {
                  var metadata;
                  if(resource.metadata){
                    metadata = resource.metadata;
                  }else{
                    metadata = {};
                  }
                  if (action.actor) {
                    metadata.actor = action.actor;
                  }
                  if (action.object) {
                    metadata.target = {
                      objectType: action.object.objectType,
                      id: action.object.id,
                      displayName: action.object.displayName
                    };
                  }
                  if (action.generator) {
                    metadata.generator = {
                      objectType: action.generator.objectType,
                      url: action.generator.url,
                      id: action.generator.id,
                      displayName: action.generator.displayName
                    };
                  }
                  if(parentIls) {
                    metadata.provider = {
                      url: parentIls.profileUrl,
                      id: parentIls.id,
                      displayName: parentIls.displayName
                    };
                  }
                  // append the metadata to the resource object
                  resource["metadata"] = metadata;
                  return cb(resource);
                });
              });
            });
          } else {
            error = {"error" : "Cannot get resource"};
            return cb(error);
          }
        });
      } else {
        error = {"error" : "resourceId cannot be empty"};
        return cb(error);
      }
    },

    // returns the metadata related to a resource by the resourceId
    getMetadata: function(resourceId, cb) {
      var error = {};
      if (resourceId && resourceId != "") {
        osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function(resource){
          if (!resource.error) {
            if(resource.metadata) {
              return cb(resource.metadata);
            } else {
              error = {"error": "The resource has no metadata"};
                return cb(error);
            }
          } else {
            error = {"error" : "Cannot get resource"};
            return cb(error);
          }
        });
      } else {
        error = {"error" : "resourceId cannot be empty"};
        return cb(error);
      }
    },

    // create a resource in the Vault, resourceName and content need to be passed
    // resourceName should be in string format, content should be in JSON format
    createResource: function(resourceName, content, metadata, cb) {
      var error = {};
      if (resourceName != null && resourceName != undefined) {
        ils.getVault(function(vault) {
          ils.getCurrentUser(function(username){
            var params = {
              "document": {
              "parentType": "@space",
              "parentSpaceId": vault.id,
              "mimeType": "txt",
              "fileName": resourceName,
              "content": JSON.stringify(content),
              "metadata": metadata
              }
            };

            osapi.documents.create(params).execute(function(resource){
              if (resource && !resource.error && resource._id ) {
                ils.getApp(function(app){
                  //log the action of adding this resource
                  ils.logAction(username, vault, resource._id, app, "add", function(response){
                    if (!response.error) {
                      return cb(resource);
                    }else{
                      error = {"error" : "The resource creation couldn't be logged"};
                      return cb(error);
                    }
                  });
                });
              } else {
                error = {"error" : "Couldn't create resource"};
                return cb(error);
              }
            });
          });
        });
      } else {
        error = {"error" : "resourceName cannot be null. Cannot create resource."};
        return cb(error);
      }
    },

  // updates a resource in the Vault, resourceId, content and metadata need to be passed
  // content should be in JSON format
  updateResource: function(resourceId, content, metadata, cb) {
    var error = {};
    if (resourceId && resourceId != "") {
      osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function(resource){
        if (!resource.error && resource.id) {
          ils.getCurrentUser(function(username){
            var newContent;
            var newMetadata;

            if(content && content!=""){
              newContent = JSON.stringify(content);
            }else{
              newContent = resource.content;
            }

            if(metadata && metadata!=""){
              newMetadata = metadata;
            }else{
              newMetadata = resource.metadata;
            }

            var params = {
              "contextId": resource.id,
              "document": {
                "parentType": resource.parentType,
                "parentSpaceId": resource.parentId,
                "mimeType": resource.mimeType,
                "fileName": resource.displayName,
                "content": newContent,
                "metadata": newMetadata
              }
            };

            osapi.documents.update(params).execute(function(resource){
              if (resource && !resource.error && resource._id ) {
                ils.getApp(function(app){
                  //log the action of adding this resource
                  ils.logAction(username, vault.id, resource.id, app, "add", function(response){
                    if (!response.error) {
                      return cb(resource);
                    }else{
                      error = {"error" : "The resource update couldn't be logged"};
                      return cb(error);
                    }
                  });
                });
              } else {
                error = {"error" : "Couldn't update resource"};
                return cb(error);
              }
            });
          });
        } else {
          error = {"error" : "Cannot get resource"};
          return cb(error);
        }
      });
    } else {
      error = {"error" : "resourceName cannot be null. Cannot update resource."};
      return cb(error);
    }
  },


  // get a list of all resources in the Vault
    listVault: function(cb) {
      var error = {"error" : "Cannot get the resources in the Vault"};
      ils.getVault(function(vault) {
        osapi.documents.get({contextId: vault.id, contextType: "@space"}).execute(function(resources){
          if (resources.list.length > 0)
            return cb(resources.list);
          else
            return cb(error);
        });
      });
    },

    // get the current ILS of the app
    getIls: function(cb) {
      var error = {"error" : "Cannot get ILS"};
      osapi.context.get().execute(function(space) {
        if (!space.error) {
          osapi.spaces.get({contextId: space.contextId}).execute(function (parentSpace) {
            if (!parentSpace.error) {
              if(parentSpace.spaceType === 'ils'){
                return cb(parentSpace, parentSpace);
              }else{
                osapi.spaces.get({contextId: parentSpace.parentId}).execute(function (parentIls){
                  if (!parentIls.error && parentIls.spaceType === 'ils') {
                    return cb(parentIls, parentSpace);
                  } else {
                    return cb(error);
                  }
                });
              }
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
                   if (item.hasOwnProperty("metadata") && item.metadata != undefined) {
                    if (item.metadata.type === "Vault") {
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

    // log the action of adding a resource in the Vault
    logAction: function(userName, vault, resourceId, app, actionType, cb) {
      var params = {
        "userId": "@viewer",
        "groupId": "@self",
        "activity": {
        "verb": actionType
        }
      };
      params.activity.actor = {
        "id": userName + "@" + vault.parentId.toString(), //the id of the ILS
        "objectType": "person",
        "name": userName
      };
      params.activity.object = {
        "id": resourceId.toString(),
        "objectType": "Asset",
        "graasp_object": "true"
      };
      params.activity.target = {
        "id": vault.id.toString(),
        "objectType": "Space",
        "graasp_object": "true"
      };
      params.activity.generator = {
        "id": app.id.toString(),
        "objectType": "Widget",
        "url": app.appUrl,
        "graasp_object": "true"
      };

      ils.getIls(function(parentSpace) {
        params.activity.provider = {
          "objectType": "ils",
          "url": parentSpace.profileUrl,
          "id": parentSpace.id.toString(),
          "displayName": parentSpace.displayName
        };
      });


      osapi.activitystreams.create(params).execute(function(response){
        if (!response.error) {
          return cb(response);
        } else {
          var error = {"error": "Cannot create activity"};
          return cb(error);
        }
      });

    },

    // get the action of adding the resource in the Vault based on resourceId and vaultId
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
        if (!response.error && (response.totalResults > 0 )) {
          return cb(response.list[0]);
        } else {
          var error = {"error": "Cannot get activity"};
          return cb(error);
        }
      });
    },

  // get the type of inquiry phase where the app is running in
    getParentInquiryPhase: function(cb) {
      var error = {"error" : "Cannot get parent inquiry phase"};
      this.getParent(function(parent) {
        if (!parent.error && parent.hasOwnProperty("metadata") && parent.metadata.hasOwnProperty("type")) {
          return cb(parent.metadata.type);
        } else {
          return cb(error);
        }
      });
    }
  };

  window.ils = ils;

}).call(this);
