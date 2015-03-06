/*
ILS Library for Go-Lab
author: María Jesús Rodríguez-Triana, Wissam Halimi
contact: maria.rodrigueztriana@epfl.ch
requirements: this library uses jquery
*/


(function() {
  var ils;
  var context_graasp = "graasp";
  var context_preview = "preview";
  var context_standalone_ils = "standalone_ils";
  var context_standalone_html = "standalone_html";
  var context_unknown = "unknown";
  var context = {
    actor : {
      "objectType": "person",
      "id": "unknown@undefined",
      "displayName": "unknown"
    },
    generator: {
      "objectType": "application",
      "url": gadgets.util.getUrlParameters().url,
      "id": "undefined",
      "displayName": "undefined"
    },

    provider: {
      "objectType": context_preview,
      "url": window.location.href,
      "id": "unknown",
      "displayName": "unknown",
      "inquiryPhaseId": "unknown",
      "inquiryPhaseName": "unknown",
      "inquiryPhase": "unknown"
    },

    target: {
      "storageId": "unknown",
      "storageType": "unknown"
    }
  };

  ils = {
    // get the nickname of the student who is currently using the ils
    getCurrentUser: function(cb) {
      var username;
      var error = {"error" : "The username couldn't be obtained."};

      ils.identifyContext(function (context_type) {
        if (context_type == context_standalone_ils) {
          if (typeof(Storage) !== "undefined") {
            username = localStorage.getItem("graasp_user");
            if (username) {
              return cb(username.toLowerCase());
            } else {
              return cb(error);
            }
          } else {
            username = $.cookie('graasp_user');
            if (username) {
              return cb(username.toLowerCase());
            } else {
              return cb(error);
            }
          }
        } else if (context_type == context_graasp) {
          osapi.people.get({userId: '@viewer'}).execute(function(viewer) {
            username = viewer.displayName;
            if (username) {
              return cb(username.toLowerCase());
            } else if (viewer.error){
              return cb(error);
            } else {
              error = {
                "error" : "The username couldn't be obtained.",
                "log" : viewer.error
              };
            }
          });
        } else {
          return cb(error);
        }
     });
    },

    identifyContext: function(cb) {
      if (typeof osapi === "undefined" || osapi === null){
        return cb(context_standalone_html);

      // http://www.golabz.eu/apps/ OR  http://composer.golabz.eu/
      } else if (document.referrer.indexOf("golabz.eu") > -1 || document.referrer == "") {
        return cb(context_preview);
           
      // http://localhost:9091/ils/ OR http://graasp.eu/ils/
      } else if (document.referrer.indexOf("ils") > -1) {
        return cb(context_standalone_ils);
           
      // http://localhost:9091/applications/    http://localhost:9091/spaces/
      // http://graasp.eu/spaces/applications/  http://graasp.eu/spaces/spaces/
      } else if (document.referrer.indexOf("graasp.eu") > -1 || document.referrer.indexOf("localhost") > -1) {
        return cb(context_graasp);

      } else {
        return cb(context_unknown);
      }
    },

    // get the parent space of the widget 
    getParent: function(cb) {
      var error = {"error" : "The parent space couldn't be obtained."};
      osapi.context.get().execute(function(context_space) {
        if (context_space != undefined && context_space != null) {
          if (!context_space.error) {
            osapi.spaces.get({contextId: context_space.contextId}).execute(function (parent) {
              if (!parent.error) {
                return cb(parent);
              } else {
                error = {
                  "error" : "The parent space couldn't be obtained.",
                  "log" : context_space.error
                };
                return cb(error);
              }
            });
          } else {
            error = {
              "error" : "The parent space couldn't be obtained.",
              "log" : context_space.error
            };
            return cb(error);
        }
      }else{
        return cb(error);
      }
      });
    },

    // get the type of inquiry phase where the app is running in
    getParentInquiryPhase: function(cb) {
      var error;
      this.getParent(function(parent) {
        if (!parent.error) {
          if (parent.hasOwnProperty("metadata") && parent.metadata.hasOwnProperty("type")) {
            return cb(parent.metadata.type);
          } else {
            error = {"error" : "The parent inquiry phase couldn't be obtained."}
            return cb(error);
          }
        }else{
          error = {
            "error": "The parent inquiry phase couldn't be obtained.",
            "log": parent.error
          };
          return cb(error);
        }
      });
    },

    // get the current ILS of the app
    getIls: function(cb) {
      var error;
      osapi.context.get().execute(function(space) {
        if (!space.error) {
          osapi.spaces.get({contextId: space.contextId}).execute(function (parentSpace) {
            if (!parentSpace.error) {
              //app at the ils level
              if(parentSpace.spaceType === 'ils'){
                return cb(parentSpace, parentSpace);
              }else{
                osapi.spaces.get({contextId: parentSpace.parentId}).execute(function (parentIls){
                  if (!parentIls.error) {
                    //app at the phase level
                    if (parentIls.spaceType === 'ils') {
                      return cb(parentIls, parentSpace);
                    } else {
                      error = {"error" : "The app is not located in an ILS or in one of its phases."};
                      return cb(error);
                    }
                  } else {
                    error = {
                      "error" : "The ils where the app is located is not available.",
                      "log" : parentIls.error
                    };
                    return cb(error);
                  }
                });
              }
            } else {
              error = {
                "error" : "The space where the app is located is not available.",
                "log" : parentSpace.error
              };
              return cb(error);

            }
          });
        } else {
          error = {
            "error" : "The id of the space where the app is located is not available.",
            "log" : space.error
          };
          return cb(error);
        }
      });
    },

    // get the Vault of the current ILS
    getVault: function(cb) {
      var error = {};
      ils.getIls(function(parentIls) {
        if (!parentIls.error) {
          ils.getVaultByIlsId(parentIls.id, function(vault) {
            if (vault){
              return cb(vault);
            }else {
              error = {"error" : "There is no Vault available."};
              return cb(error);
            }
          });
        } else {
          error = {
            "error" : "The space is not available.",
            "log" : parentIls.error
          };
          return cb(error);
        }
      });
    },

    // get the Vault of the current ILS
    getVaultByIlsId: function(ilsId, cb) {
      var error = {};
      if(ilsId && ilsId != ""){
        osapi.spaces.get({contextId: ilsId, contextType: "@space"}).execute(
            function(items) {
              var vault = _.find(items.list, function(item){
                return item.spaceType && item.metadata && item.metadata.type === "Vault";
              });
              return cb(vault);
            }
        );
      }else{
        error = {"error" : "There ILS identifier cannot be empty. The Vault space could not be obtained"};
        return cb(error);
      }
    },

    // get the info of the current app
    getApp: function(cb) {
      osapi.apps.get({contextId: "@self"}).execute(function(response){
        if (!response.error) {
          return cb(response);
        } else {
          var error = {
            "error": "The app couldn't be obtained.",
            "log": response.error
          };
          return cb(error);
        }
      });
    },

    // get the current appId
    getAppId: function(cb) {
      ils.getApp(function(app) {
        if (app.id) { //for os apps
          return cb(app.id);
        } else {
          ils.getIls(function(space) {
            if(space.id){ //for metawidget
              return cb(space.id);
            }else{
              var error = {"error": "The appId couldn't be obtained. No Open Social App or metawidget was found."};
              return cb(error);
            }
          });
        }
      });
    },

    // get the parameters that describe the context of the app (actor, generator, provider, target)
    getContextFromMetadata: function(metadata, cb) {
      if (!metadata.actor || !metadata.actor.objectType || !metadata.actor.id || !metadata.actor.displayName){
        ils.getCurrentUser(function(viewer) {
          if (viewer && viewer != "" && !viewer.error) {
            //to be fixed once we have the temporary users (viewer.id/owner.id)
            //to be fixed once we have the temporary users (viewer.id/owner.id)
            context.actor.id = context.actor.id.replace("unknown", viewer);
            context.actor.displayName = viewer;
          }
        });
      }else{
        context.actor = metadata.actor;
      }

      if (!metadata.generator || !metadata.generator.objectType || !metadata.generator.url || !metadata.generator.id
          || !metadata.generator.displayName){
        ils.getApp(function (app) {
          if (app && app.id) {
            context.generator.url = app.appUrl;
            context.generator.id = app.id;
            context.generator.displayName = app.displayName;
          }
        });
      }else{
        context.generator = metadata.generator;
      }

      if (!metadata.provider || !metadata.provider.objectType || !metadata.provider.url || !metadata.provider.id
          || !metadata.provider.displayName || !metadata.provider.inquiryPhaseId || !metadata.provider.inquiryPhaseName
          || !metadata.provider.inquiryPhase){
        ils.getIls(function (space, subspace) {
          if (space && space.id) {
            context.actor.id = context.actor.id.replace("undefined", space.id);
            context.provider.objectType = space.spaceType;
            context.provider.url = space.profileUrl;
            context.provider.id = space.id;
            context.provider.displayName = space.displayName;

            if (subspace && subspace.id && space.id != subspace.id) {
              context.provider.inquiryPhaseId = subspace.id;
              context.provider.inquiryPhaseName = subspace.displayName;
              if (subspace.metadata && subspace.metadata.type) {
                context.provider.inquiryPhase = subspace.metadata.type;
              }
            }
          }
        });
      }else{
        context.provider = metadata.provider;
      }

      if (!metadata.target || !metadata.target.storageId || !metadata.target.storageType){
        ils.getVault(function (vault) {
          if (vault && vault.id) {
            context.target.storageId = vault.id;
            context.target.storageType = vault.spaceType;
          }
        });
      }else{
        context.target = metadata.target;
      }

      return cb();

    },

    // get the parameters that describe the context of the app (actor, generator, provider, target)
    getAppContextParameters: function(cb) {
      ils.getCurrentUser(function(viewer) {
        osapi.people.get({userId: '@owner'}).execute(function(owner) {
          ils.getApp(function (app) {
            ils.getIls(function (space, subspace) {
              ils.getVault(function (vault) {
                ils.setContextParameters(viewer, owner, app, space, subspace, vault, function (){
                  return cb(context);
                });
              });
            });
          });
        });
      });
    },

    setContextParameters: function (viewer, owner, app, space, subspace, vault, cb){
      if (viewer && viewer != "" && !viewer.error) {
        //to be fixed once we have the temporary users (viewer.id/owner.id)
        context.actor.id = context.actor.id.replace("unknown", viewer);
        context.actor.displayName = viewer;
      }

      if (app && app.id) {
        context.generator.url = app.appUrl;
        context.generator.id = app.id;
        context.generator.displayName = app.displayName;
      }

      if (space && space.id) {
        context.actor.id = context.actor.id.replace("undefined", space.id);
        context.provider.objectType = space.spaceType;
        context.provider.url = space.profileUrl;
        context.provider.id = space.id;
        context.provider.displayName = space.displayName;

        if (subspace && subspace.id && space.id != subspace.id) {
          context.provider.inquiryPhaseId = subspace.id;
          context.provider.inquiryPhaseName = subspace.displayName;
          if (subspace.metadata && subspace.metadata.type) {
            context.provider.inquiryPhase = subspace.metadata.type;
          }
        }
      }

      if (vault && vault.id) {
        context.target.storageId = vault.id;
        context.target.storageType = vault.spaceType;
      }

      return cb();
    },

    // delete a resource by the resourceId, the result is true if the resource has been successfully deleted
    deleteResource: function(resourceId, cb) {
      var error = {};
      ils.existResource(resourceId, function (exists) {
        if (exists) {
          ils.getVault(function (vault) {
            ils.getCurrentUser(function (username) {
              osapi.documents.delete({contextId: resourceId}).execute(function (deleteResponse) {
                if (deleteResponse){
                  if (!deleteResponse.error) {
                    ils.getApp(function (app) {
                      //log the action of adding this resource
                      ils.logAction(username, vault.id, resourceId, app.id, app.appUrl, "remove", function (logResponse) {
                        if (!logResponse.error) {
                          return cb(true);
                        } else {
                          error = {
                            "error": "The resource removal couldn't be logged.",
                            "log": logResponse.error
                          };
                          return cb(error);
                       }
                     });
                    });
                  } else {
                    error = {
                      "error": "The resource couldn't be removed.",
                      "log": deleteResponse.error
                    };
                    return cb(error);
                  }
                } else {
                  error = {"error": "The resource couldn't be removed."};
                  return cb(error);
                }
              });
            });
          });
        } else {
          error = {"error": "The resource to be deleted is not available. The resource couldn't be removed."};
          return cb(error);
        }
      });
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
        error = {"error" : "The resourceId cannot be empty. The resource couldn't be obtained."};
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
              // get the associated activity of this resource
              // e.g. student mario has added a concept map via the app Concept Mapper in ILS 1000
              ils.getAction(resource.parentId, resourceId, function(action) {
                var metadata = "";
                if (resource.metadata) {
                  metadata = resource.metadata;
                }
                // append the metadata to the resource object
                resource["metadata"] = metadata;
                return cb(resource);
              });
            });
          } else {
            error = {
              "error" : "The resource is not available.",
              "log": resource.error
            };
            return cb(error);
          }
        });
      } else {
        error = {"error" : "The resourceId cannot be empty. The resource couldn't be read."};
        return cb(error);
      }
    },

    // returns the metadata related to a resource by the resourceId
    getMetadata: function(resourceId, cb) {
      var error = {};
      if (resourceId && resourceId != "") {
        osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function(resource){
          if (!resource.error) {
            ils.getIls(function(parentIls) {
              // get the associated activity of this resource
              // e.g. student mario has added a concept map via the app Concept Mapper in ILS 1000
              ils.getAction(resource.parentId, resourceId, function(action) {
                if(resource.metadata) {
                  return cb(JSON.parse(resource.metadata));
                } else {
                  error = {"error": "The resource has no metadata."};
                  return cb(error);
                }
              });
            });
          } else {
            error = {
              "error" : "The resource is not available.",
              "log": resource.error
            };
            return cb(error);
          }
        });
      } else {
        error = {"error" : "The resourceId cannot be empty. The metadata couldn't be obtained."};
        return cb(error);
      }
    },

    // returns the basic metadata inferred from the history
    obtainMetadataFromAction: function(metadata, action, parentIls) {
        var extendedMetadata = "";
        if(metadata){
          extendedMetadata= JSON.parse(metadata);
        }else{
          extendedMetadata = {};
        }
        if (action.actor) {
          extendedMetadata.actor = action.actor;
        }
        if (action.object) {
          extendedMetadata.target = {
            objectType: action.object.objectType,
            id: action.object.id,
            displayName: action.object.displayName
          };
        }
        if (action.generator) {
          extendedMetadata.generator = {
            objectType: action.generator.objectType,
            url: action.generator.url,
            id: action.generator.id,
            displayName: action.generator.displayName
          };
        }
        if(parentIls) {
          extendedMetadata.provider = {
            url: parentIls.profileUrl,
            id: parentIls.id,
            displayName: parentIls.displayName
          };
        }
        return (extendedMetadata);
    },

    // create a resource in the Vault, resourceName and content need to be passed
    // resourceName should be in string format, metadata and content should be in JSON format
    createResource: function(resourceName, content, metadata, cb) {
      var error = {};
      if (resourceName != null && resourceName != undefined) {
        ils.getContextFromMetadata(metadata, function(){

 //       ils.getVault(function(vault) {
           ils.getUniqueName(resourceName, function(uniqueName){
   //         if(nameList.indexOf(resourceName)==-1) {
//              ils.getCurrentUser(function(username){
//                var creator = username;
//                if (username.error) {
//                  creator = "unknown";
//                }
                var params = {
                  "document": {
                    "parentType": "@space",
                    "parentSpaceId": context.target.storageId,
                    "mimeType": "txt",
                    "fileName": uniqueName,
                    "content": JSON.stringify(content),
                    "metadata": metadata
                  }
                };

                osapi.documents.create(params).execute(function(resource){
                  if (resource && !resource.error && resource.id ) {
 //                   ils.getApp(function(app){
                      //log the action of adding this resource
                      ils.logAction(context.actor.displayName, context.target.storageId, resource.id, context.generator.id, context.generator.url, "add", function(response){
                        if (!response.error) {
                          return cb(resource);
                        }else{
                          error = {
                            "error" : "The resource creation couldn't be logged.",
                            "log" : response.error
                          };
                          return cb(error);
                        }
                      });
//                    });
                  } else {
                    error = {
                      "error" : "The resource couldn't be created.",
                      "log" : resource.error
                    };
                    return cb(error);
                  }
                });
//              });
//            }else{
//              error = {"error" : "The resourceName already exists in the space."};
//              return cb(error);
//            }
          });
 //       });
        });
      } else {
        error = {"error" : "The resourceName cannot be empty. The resource couldn't be created."};
        return cb(error);
      }
    },

  // ensure unique filenames
  getUniqueName: function(resourceName, cb) {
    ils.listVaultNames(function(nameList){
      if(nameList.indexOf(resourceName)==-1 && nameList.indexOf(resourceName+".txt")==-1) {
        return cb(resourceName);
      }else{
        //The resourceName already exists in the space
        ils.getCurrentUser(function (username) {
          var timeStamp = new Date().getTime();
          var uniqueName = username + "_" + timeStamp + "_" + resourceName;
          return cb(uniqueName);
        });
      }
    });
  },

  createConfigurationSpace: function(vaultId, cb) {
    osapi.spaces.create({contextId:vaultId, params:{"displayName": "Configuration"}}).execute(function(space){
      return cb(space);
    });
  },

    //Returns the Configuration Space based on the VaultId
  getConfiguration: function(cb) {
    var error = {};
    ils.getVault(function(vault) {
      if (!vault.error) {
        osapi.spaces.get({contextId: vault.id, contextType: "@space"}).execute(
          function (items) {
            var configurationSpace = _.find(items.list, function (item) {
              return item.spaceType && item.displayName === "Configuration";
            });

            if (configurationSpace) {
              return cb(configurationSpace);
            } else {
              ils.createConfigurationSpace(vault.id, function (newConfigurationSpace) {
                return cb(newConfigurationSpace);
              });
            }
          }
        );
      } else {
        error = {
          "error": "The Vault is not available.",
          "log": vault.error
        };
        return cb(error);
      }
    });

  },

    // create a configuration file in the Vault, resourceName and content need to be passed
    // resourceName should be in string format, content should be in JSON format
  createConfigurationFile: function(resourceName, content, metadata, cb) {
    var error = {};
    if (resourceName != null && resourceName != undefined) {
      ils.getConfiguration(function (space) {
            ils.listConfigurationNames(function (nameList) {
              if (nameList.indexOf(resourceName) == -1 && nameList.indexOf(resourceName + ".txt") == -1) {
                ils.getCurrentUser(function (username) {
                  var creator = username;
                  if (username.error) {
                    creator = "unknown";
                  }
                  var params = {
                    "document": {
                      "parentType": "@space",
                      "parentSpaceId": space.id,
                      "mimeType": "txt",
                      "fileName": resourceName,
                      "content": JSON.stringify(content),
                      "metadata": metadata
                    }
                  };

                  osapi.documents.create(params).execute(function (resource) {
                    if (resource && !resource.error && resource.id) {
                      ils.getApp(function (app) {
                      //log the action of adding this resource
                        ils.logAction(creator, space.id, resource.id, app.id, app.appUrl, "add", function (response) {
                          if (!response.error) {
                            return cb(resource);
                          } else {
                            error = {
                              "error": "The resource creation couldn't be logged.",
                              "log": response.error
                            };
                            return cb(error);
                          }
                        });
                      });
                    } else {
                      error = {
                        "error": "The resource couldn't be created.",
                        "log": resource.error
                      };
                      return cb(error);
                    }
                  });
                });
              } else {
                error = {"error": "The resourceName already exists in the space."};
                return cb(error);
              }
            });
          });

    } else {
      error = {"error" : "The resourceName cannot be empty. The resource couldn't be created."};
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
              if (resource && !resource.error && resource.id ) {
                ils.getApp(function(app){
                  //log the action of adding this resource
                  ils.getVault(function(vault) {
                      ils.logAction(username, vault.id, resource.id, app.id, app.appUrl, "add", function(response){
                        if (!response.error) {
                          return cb(resource);
                        }else{
                          error = {
                            "error": "The resource update couldn't be logged.",
                            "log": response.error
                          };
                          return cb(error);
                        }
                      });
                  });
                });

              } else {
                error = {
                  "error" : "The resource couldn't be updated.",
                  "log" : resource.error
                };
                return cb(error);
              }
            });
          });
        } else {
          error = {
            "error" : "The resource is not available.",
            "log" : resource.error
          };
          return cb(error);
        }
      });
    } else {
      error = {"error" : "The resourceName cannot be null. The resource couldn't be updated."};
      return cb(error);
    }
  },

    // get a list of all resources in the Space
    listFilesBySpaceId: function(spaceId, cb) {
      var error = {"error" : "The spaceId cannot be empty."};
      if (spaceId && spaceId != "") {
        osapi.documents.get({contextId: spaceId, contextType: "@space"}).execute(function (resources) {
          if (resources.list)
            return cb(resources.list);
          else
            return cb(error);
        });
      }else{
        return cb(space.error);
      }
    },

  // get a list of all resources in the Vault
    listVault: function(cb) {
      ils.getVault(function(space) {
        if(!space.error) {
          ils.listFilesBySpaceId(space.id, function(list){
            return cb(list);
          });
        }else{
          return cb(space.error);
        }
      });
    },

    // get a list of all resources in the Vault
    listConfiguration: function(cb) {
      ils.getConfiguration(function(space) {
        if(!space.error) {
          ils.listFilesBySpaceId(space.id, function(list){
            return cb(list);
          });
        }else{
          return cb(space.error);
        }
      });
    },

    // get a list of all resources in the Vault
    listVaultNames: function(cb) {
      var nameList = [];
      ils.listVault(function(resourceList) {
        if(!resourceList.error){
          for (i = 0; i < resourceList.length; i++) {
            nameList.push(resourceList[i].displayName);
          }
          return cb(nameList);
        }else{
          return cb(resourceList.error);
        }
      });
    },

    // get a list of all resources in the Configuration
    listConfigurationNames: function(cb) {
      var nameList = [];
      ils.listConfiguration(function(resourceList) {
        if(!resourceList.error){
          for (i = 0; i < resourceList.length; i++) {
            nameList.push(resourceList[i].displayName);
          }
          return cb(nameList);
        }else{
          return cb(resourceList.error);
        }
      });
    },

    // get a list of all resources in the Vault including all the metadata extracted from the actions
    listVaultExtended: function(cb) {
      var error = {"error" : "No resource available in the Vault."};
      ils.getVault(function(vault) {
        osapi.documents.get({contextId: vault.id, contextType: "@space"}).execute(function(resources) {
          if (resources.list) {
           if (resources.list.length > 0) {
            ils.getIls(function (parentIls) {
              $.each(resources.list, function(index, value) {
                // get the associated activity of this resource
                // e.g. student mario has added a concept map via the app Concept Mapper in ILS 1000
                ils.getAction(vault.id, value.id, function (action) {
                  var metadata = "";
                  if (value.metadata) {
                    metadata = value.metadata;
                  }
                  // append the metadata to the resource object
                  value["metadata"] = metadata;
                });
              });
            });
          }
          return cb(resources.list);
        }else{
          return cb(error);
        }
        });
      });
    },




    // log the action of adding a resource in the Vault
    logAction: function(userName, spaceId, resourceId, appId, appUrl, actionType, cb) {
      var params = {
        "userId": "@viewer",
        "groupId": "@self",
        "published": new Date().toISOString(),
        "verb": actionType,
        "activity": {
        }
      };
      params.activity.object = {
        "id": resourceId,
        "objectType": "Asset",
        "graasp_object": "true"
      };
      params.activity.target = {
        "id": spaceId,
        "objectType": "Space",
        "graasp_object": "true"
      };
      params.activity.generator = {
        "id": appId,
        "objectType": "Widget",
        "url": appUrl,
        "graasp_object": "true"
      };

      ils.getIls(function(parentSpace) {
        params.activity.actor = {
          "id": userName + "@" + parentSpace.id,
          "objectType": "person",
          "name": userName
        };
        params.activity.provider = {
          "objectType": "ils",
          "url": parentSpace.profileUrl,
          "id": parentSpace.id,
          "displayName": parentSpace.displayName
        };

        osapi.activitystreams.create(params).execute(function(response){
          if (response.id && !response.error) {
            return cb(response);
          } else {
            var error = {
              "error": "The activity couldn't be logged.",
              "log": response.error
            };
            return cb(error);
          }
        });
      });
    },

    // get the action of adding the resource in the Vault based on resourceId and vaultId
    getAction: function(vaultId, resourceId, cb) {
      var error;
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
        if (!response.error) {
          if (response.totalResults > 0) {
            return cb(response.list[0]);
          } else {
            error = {"error": "The activity couldn't be obtained."};
            return cb(error);
          }
        } else {
          error = {
            "error": "The activity couldn't be obtained.",
            "log": response.error
          };
          return cb(error);
        }
      });
    }
  };

  window.ils = ils;

}).call(this);
