/*
 ILS Library for Go-Lab
 author: María Jesús Rodríguez-Triana, Wissam Halimi
 contact: maria.rodrigueztriana@epfl.ch
 requirements: this library uses jquery
 */


(function () {
    var ils;
    var context_graasp = "graasp";
    var context_preview = "preview";
    var context_standalone_ils = "standalone_ils";
    var context_standalone_html = "standalone_html";
    var context_unknown = "unknown";
    var user_student = "graasp_student";
    var user_viewer = "graasp_viewer";
    var user_editor = "graasp_editor";
    var context = {
        actor: {
            "objectType": "person",
            "id": null,
            "displayName": null
        },
        generator: {
            "objectType": "application",
            "url": (typeof gadgets != "undefined") ? gadgets.util.getUrlParameters().url : window.location.href,
            "id": null,
            "displayName": null
        },

        provider: {
            "objectType": context_preview,
            "url": window.location.href,
            "id": null,
            "displayName": null,
            "inquiryPhaseId": "undefined",
            "inquiryPhaseName": "undefined",
            "inquiryPhase": "undefined"
        },

        target: {},

        "storageId": null,
        "storageType": null

    };

    //var counter_getCurrentUser = 0;
    //var counter_identifyContext = 0;
    //var counter_getParent = 0;
    //var counter_getParentInquiryPhase = 0;
    //var counter_getIls = 0;
    //var counter_getIlsId = 0;
    //var counter_getSpaceBySpaceId = 0;
    //var counter_getItemsBySpaceId = 0;
    //var counter_getSubspacesBySpaceId = 0;
    //var counter_getAppsBySpaceId = 0;
    //var counter_getVault = 0;
    //var counter_getVaultByIlsId = 0;
    //var counter_getApp = 0;
    //var counter_getAppId = 0;
    //var counter_getContextFromMetadata = 0;
    //var counter_getAppContextParameters = 0;
    //var counter_deleteResource = 0;
    //var counter_existResource = 0;
    //var counter_readResource = 0;
    //var counter_getMetadata = 0;
    //var counter_obtainMetadataFromAction = 0;
    //var counter_createResource = 0;
    //var counter_getUniqueName = 0;
    //var counter_getConfiguration = 0;
    //var counter_getAllConfigurations = 0;
    //var counter_setAppConfiguration = 0;
    //var counter_updateResource = 0;
    //var counter_listFilesBySpaceId = 0;
    //var counter_listVault = 0;
    //var counter_filterVault = 0;
    //var counter_listConfiguration = 0;
    //var counter_listVaultNames = 0;
    //var counter_listConfigurationNames = 0;
    //var counter_listVaultExtended = 0;
    //var counter_listVaultExtendedById = 0;
    //var counter_logAction = 0;
    //var counter_getAction = 0;

    ils = {
        // get the nickname of the student who is currently using the ils
        getCurrentUser: function (cb) {
            //counter_getCurrentUser++;
            //console.log("counter_getCurrentUser " + counter_getCurrentUser);
            var error = {"error": "The username couldn't be obtained."};
            var context_type = ils.identifyContext();

            //get the user logged in the Graasp
            function getLoggedUser (cb) {
                var logged_user;
                osapi.people.get({userId: '@viewer'}).execute(function (viewer) {
                    if (viewer.id && viewer.displayName) {
                        logged_user = {
                            "id": viewer.id,
                            "displayName": viewer.displayName
                        }
                        return cb(logged_user);
                    } else {
                        error = {
                            "error": "The username couldn't be obtained.",
                            "log": viewer.error
                        };
                        return cb(error);
                    }
                });
            }

            //get the reviewer in case of existing
            function getReviewer (cb) {
                var reviewer;
                if (gadgets.util.getUrlParameters()['view-params'] && JSON.parse(gadgets.util.getUrlParameters()['view-params'])) {
                    var view_params = JSON.parse(gadgets.util.getUrlParameters()['view-params']);
                    reviewer = (view_params) ? view_params.reviewer : null;
                    return cb(reviewer);
                }
            }

            getLoggedUser(function(logged_user){
                if (!logged_user.error) {
                    getReviewer(function (reviewer) {
                        //reviewer accessing the ILS
                        if (reviewer && reviewer.id && reviewer.username) {
                            // the reviewer will be the actor of any action
                            context.actor.id = reviewer.id;
                            context.actor.displayName = reviewer.username;
                            context.actor.objectType = user_editor;

                            // the contextual user will represent the student
                            context.contextualActor = {
                                "id": logged_user.id,
                                "displayName": logged_user.displayName,
                                "objectType": user_student
                            };

                            return cb(context.actor.displayName.toLowerCase());

                            //real or temporary users
                        } else if (context_type == context_graasp || context_type == context_standalone_ils) {
                            context.actor.id = logged_user.id;
                            context.actor.displayName = logged_user.displayName;
                            context.actor.objectType = (context_type == context_standalone_ils) ? user_student : "person";

                            return cb(context.actor.displayName.toLowerCase());

                        } else {
                            return cb(error);
                        }

                    });
                } else {
                    return cb(error);
                }
            });
        },

        // Returns the type of context where the app is running
        identifyContext: function () {
            //counter_identifyContext++;
            //console.log("counter_identifyContext " + counter_identifyContext);

            if (typeof osapi === "undefined" || osapi === null) {
                return (context_standalone_html);

                // http://www.golabz.eu/apps/ OR  http://composer.golabz.eu/
            } else if (document.referrer.indexOf("golabz.eu") > -1 || document.referrer == "") {
                return (context_preview);

                // http://localhost:9091/ils/ OR http://graasp.eu/ils/
            } else if (document.referrer.indexOf("ils") > -1) {
                return (context_standalone_ils);

                // http://localhost:9091/applications/    http://localhost:9091/spaces/
                // http://graasp.eu/spaces/applications/  http://graasp.eu/spaces/spaces/
            } else if (document.referrer.indexOf("graasp.eu") > -1 || document.referrer.indexOf("localhost") > -1) {
                return (context_graasp);

            } else {
                return (context_unknown);
            }
        },

        // get the parent space of the widget
        getParent: function (cb) {
            //counter_getParent++;
            //console.log("counter_getParent " + counter_getParent);
            var error = {"error": "The parent space couldn't be obtained."};
            osapi.context.get().execute(function (context_space) {
                if (context_space && context_space != undefined) {
                    if (!context_space.error) {
                        osapi.spaces.get({contextId: context_space.contextId}).execute(function (parent) {
                            if (!parent.error) {
                                return cb(parent);
                            } else {
                                error = {
                                    "error": "The parent space couldn't be obtained.",
                                    "log": context_space.error
                                };
                                return cb(error);
                            }
                        });
                    } else {
                        error = {
                            "error": "The parent space couldn't be obtained.",
                            "log": context_space.error
                        };
                        return cb(error);
                    }
                } else {
                    return cb(error);
                }
            });
        },

        // get the type of inquiry phase where the app is running in
        getParentInquiryPhase: function (cb) {
            //counter_getParentInquiryPhase++;
            //console.log("counter_getParentInquiryPhase " + counter_getParentInquiryPhase);
            var error;
            this.getParent(function (parent) {
                if (!parent.error) {
                    if (parent.hasOwnProperty("metadata") && parent.metadata.hasOwnProperty("type")) {
                        return cb(parent.metadata.type);
                    } else {
                        error = {"error": "The parent inquiry phase couldn't be obtained."}
                        return cb(error);
                    }
                } else {
                    error = {
                        "error": "The parent inquiry phase couldn't be obtained.",
                        "log": parent.error
                    };
                    return cb(error);
                }
            });
        },

        // get the current ILS of the app
        getIls: function (cb) {
            //counter_getIls++;
            //console.log("counter_getIls " + counter_getIls);
            var error;
            osapi.context.get().execute(function (space) {
                if (!space.error) {
                    osapi.spaces.get({contextId: space.contextId}).execute(function (parentSpace) {
                        if (!parentSpace.error && parentSpace.id) {
                            //app at the ils level
                            if (parentSpace.spaceType === 'ils') {
                                context.provider.objectType = parentSpace.spaceType;
                                context.provider.url = parentSpace.profileUrl;
                                context.provider.id = parentSpace.id;
                                context.provider.displayName = parentSpace.displayName;
                                if (parentSpace.metadata && parentSpace.metadata.ilsRef) {
                                    context.provider.ilsRef = parentSpace.metadata.ilsRef;
                                }
                                return cb(parentSpace, parentSpace);
                            } else {
                                osapi.spaces.get({contextId: parentSpace.parentId}).execute(function (parentIls) {
                                    if (!parentIls.error) {
                                        //app at the phase level
                                        if (parentIls.spaceType === 'ils') {
                                            context.provider.objectType = parentIls.spaceType;
                                            context.provider.url = parentIls.profileUrl;
                                            context.provider.id = parentIls.id;
                                            context.provider.displayName = parentIls.displayName;
                                            context.provider.inquiryPhaseId = parentSpace.id;
                                            context.provider.inquiryPhaseName = parentSpace.displayName;
                                            if (parentSpace.metadata && parentSpace.metadata.type) {
                                                context.provider.inquiryPhase = parentSpace.metadata.type;
                                            }
                                            if (parentIls.metadata && parentIls.metadata.ilsRef) {
                                                context.provider.ilsRef = parentIls.metadata.ilsRef;
                                            }
                                            return cb(parentIls, parentSpace);
                                        } else {
                                            error = {"error": "The app is not located in an ILS or in one of its phases."};
                                            return cb(error);
                                        }
                                    } else {
                                        error = {
                                            "error": "The ils where the app is located is not available.",
                                            "log": parentIls.error
                                        };
                                        return cb(error);
                                    }
                                });
                            }
                        } else {
                            error = {
                                "error": "The space where the app is located is not available.",
                                "log": parentSpace.error
                            };
                            return cb(error);

                        }
                    });
                } else {
                    error = {
                        "error": "The id of the space where the app is located is not available.",
                        "log": space.error
                    };
                    return cb(error);
                }
            });
        },


        // get the Id of the current ILS
        getIlsId: function (cb) {
            //counter_getIlsId++;
            //console.log("counter_getIlsId " + counter_getIlsId);
            var ilsId = context.provider.id;

            if (!ilsId){
                ils.getIls(function(space){
                    return cb(space.id);
                });
            }else{
                return cb(ilsId);
            }
        },

        // get the description of an space based on the spaceId
        getSpaceBySpaceId: function (spaceId, cb) {
            //counter_getSpaceBySpaceId++;
            //console.log("counter_getSpaceBySpaceId " + counter_getSpaceBySpaceId);
            osapi.spaces.get({contextId: spaceId}).execute(function (space) {
                if (!space.error && space.id) {
                    return cb(space);
                } else {
                    error = {
                        "error": "The space is not available.",
                        "log": space.error
                    };
                    return cb(error);
                }
            });
        },

        // get the items of the spaceId
        getItemsBySpaceId: function (spaceId, cb) {
            //counter_getItemsBySpaceId++;
            //console.log("counter_getItemsBySpaceId " + counter_getItemsBySpaceId);
            var error;
            osapi.spaces.get({contextId: spaceId, contextType: "@space"}).execute(function (items) {
                if (!items.error && items.list) {
                    return cb(items.list);
                } else {
                    error = {
                        "error": "The list of items could not be obtained.",
                        "log": items.error
                    };
                    return cb(error);
                }
            });
        },

        // get the subspaces of the spaceId
        getSubspacesBySpaceId: function (spaceId, cb) {
            //counter_getSubspacesBySpaceId++;
            //console.log("counter_getSubspacesBySpaceId " + counter_getSubspacesBySpaceId);
            var error;
            ils.getItemsBySpaceId(spaceId, function (items) {
                if (!items.error) {
                    var subspaces = _.filter(items, function (item) {
                        return item.spaceType;
                    });
                    return cb(subspaces);
                } else {
                    error = {
                        "error": "The list of spaces could not be obtained.",
                        "log": items.error
                    };
                    return cb(error);
                }
            });
        },

        // get the apps of the spaceId
        getAppsBySpaceId: function (spaceId, cb) {
            //counter_getAppsBySpaceId++;
            //console.log("counter_getAppsBySpaceId " + counter_getAppsBySpaceId);
            var error;
            ils.getItemsBySpaceId(spaceId, function (items) {
                if (!items.error) {
                    var apps = _.filter(items, function (item) {
                        return item.itemType && item.itemType === "Application";
                    });
                    return cb(apps);
                } else {
                    error = {
                        "error": "The list of apps could not be obtained.",
                        "log": items.error
                    };
                    return cb(error);
                }
            });
        },

        // get the Vault of the current ILS
        getVault: function (cb) {
            //counter_getVault++;
            //console.log("counter_getVault " + counter_getVault);
            var error = {};
            ils.getIls(function (parentIls) {
                if (!parentIls.error) {
                    ils.getVaultByIlsId(parentIls.id, function (vault) {
                        if (vault && vault.id) {
                            return cb(vault);
                        } else {
                            error = {"error": "There is no Vault available."};
                            return cb(error);
                        }
                    });
                } else {
                    error = {
                        "error": "The space is not available.",
                        "log": parentIls.error
                    };
                    return cb(error);
                }
            });
        },

        // get the Vault of the current ILS
        getVaultByIlsId: function (ilsId, cb) {
            //counter_getVaultByIlsId++;
            //console.log("counter_getVaultByIlsId " + counter_getVaultByIlsId);
            var error = {};
            if (ilsId && ilsId != "") {
                osapi.spaces.get({contextId: ilsId, contextType: "@space"}).execute(
                    function (items) {
                        var vault = _.find(items.list, function (item) {
                            return item.spaceType && item.metadata && item.metadata.type === "Vault";
                        });
                        if (vault && vault.id) {
                            context.storageId = vault.id;
                            context.storageType = vault.spaceType;
                            return cb(vault);
                        } else {
                            error = {"error": "There is no Vault available."};
                            return cb(error);
                        }
                    }
                );
            } else {
                error = {"error": "There ILS identifier cannot be empty. The Vault space could not be obtained"};
                return cb(error);
            }
        },

        // get the info of the current app
        getApp: function (cb) {
            //counter_getApp++;
            //console.log("counter_getApp " + counter_getApp);
            osapi.apps.get({contextId: "@self"}).execute(function (response) {
                if (!response.error && response.id) {
                    context.generator.url = response.appUrl;
                    context.generator.id = response.id;
                    context.generator.displayName = response.displayName;

                    //TODO updates when graasp deals with the app permissions
                    if (context.actor.objectType=="person" && response.memberships) {
                        var isMember = _.filter(response.memberships, function (member) {
                            return (member.userId === context.actor.id ) && (member.memberType === "owner" || member.memberType === "contributor");
                        });
                        if (isMember.length>0) {
                            context.actor.objectType = user_editor;
                        } else {
                            context.actor.objectType = user_viewer;
                        }
                    }

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
        getAppId: function (cb) {
            //counter_getAppId++;
            //console.log("counter_getAppId " + counter_getAppId);
            ils.getApp(function (app) {
                if (app.id) { //for os apps
                    return cb(app.id);
                } else {
                    ils.getIls(function (space) {
                        if (space.id) { //for metawidget
                            return cb(space.id);
                        } else {
                            var error = {"error": "The appId couldn't be obtained. No Open Social App or metawidget was found."};
                            return cb(error);
                        }
                    });
                }
            });
        },

        // get the parameters that describe the context of the app (actor, generator, provider, target)
        getContextFromMetadata: function (metadata, cb) {
            //counter_getContextFromMetadata++;
            //console.log("counter_getContextFromMetadata " + counter_getContextFromMetadata);
            if (!metadata.actor || !metadata.actor.objectType || !metadata.actor.id || !metadata.actor.displayName
                || !metadata.actor.id) {
                ils.getCurrentUser(function (viewer) {});
            } else {
                context.actor = metadata.actor;
            }

            if (!metadata.generator || !metadata.generator.objectType || !metadata.generator.url || !metadata.generator.id
                || !metadata.generator.displayName) {
                ils.getApp(function (app) {
                    if (app && app.id) {
                        context.generator.url = app.appUrl;
                        context.generator.id = app.id;
                        context.generator.displayName = app.displayName;
                    }
                });
            } else {
                context.generator = metadata.generator;
            }

            if (!metadata.provider || !metadata.provider.objectType || !metadata.provider.url || !metadata.provider.id
                || !metadata.provider.displayName || !metadata.provider.inquiryPhaseId || !metadata.provider.inquiryPhaseName
                || !metadata.provider.inquiryPhase) {
                ils.getIls(function (space, subspace) {
                    if (space && space.id) {
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
            } else {
                context.provider = metadata.provider;
            }

            if (!metadata.storageId || !metadata.storageType) {
                ils.getVault(function (vault) {
                    if (vault && vault.id) {
                        context.storageId = vault.id;
                        context.storageType = vault.spaceType;
                    }
                });
            } else {
                context.storageId = metadata.storageId;
                context.storageType = metadata.storageType;
            }

            return cb();

        },

        // get the parameters that describe the context of the app (actor, generator, provider, target)
        getAppContextParameters: function (cb) {
            //counter_getAppContextParameters++;
            //console.log("counter_getAppContextParameters " + counter_getAppContextParameters);
            if (context.actor.id && context.generator.id && context.provider.id && context.storageId) {
                return cb(context);
            } else {
                ils.getCurrentUser(function (viewer) {
                   ils.getApp(function (app) {
                        ils.getIls(function (space, subspace) {
                            ils.getVaultByIlsId(space.id, function (vault) {
                                return cb(context);
                            });
                        });
                    });
                });
            }
        },


        // delete a resource by the resourceId, the result is true if the resource has been successfully deleted
        deleteResource: function (resourceId, cb) {
            //counter_deleteResource++;
            //console.log("counter_deleteResource " + counter_deleteResource);
            var error = {};
            ils.existResource(resourceId, function (exists) {
                if (exists) {
                    ils.getVault(function (vault) {
                        ils.getCurrentUser(function (username) {
                            osapi.documents.delete({contextId: resourceId}).execute(function (deleteResponse) {
                                if (deleteResponse) {
                                    if (!deleteResponse.error) {
                                        return cb(true);
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
        existResource: function (resourceId, cb) {
            //counter_existResource++;
            //console.log("counter_existResource " + counter_existResource);
            var error = {};
            if (resourceId && resourceId != "") {
                osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function (resource) {
                    if (resource && !resource.error && resource.url) {
                        return cb(true);
                    } else {
                        return cb(false);
                    }
                });
            } else {
                error = {"error": "The resourceId cannot be empty. The resource couldn't be obtained."};
                return cb(error);
            }
        },

        // read a resource by the resourceId, the result is the combination of resource content and the metadata
        readResource: function (resourceId, cb) {
            //counter_readResource++;
            //console.log("counter_readResource " + counter_readResource);

            var error = {};
            if (resourceId && resourceId != "") {
                osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function (resource) {
                    if (!resource.error && resource.id) {
                        //TODO: those resources without metadada should be enriched based on the actions registered
//              ils.getAction(resource.parentId, resourceId, function(action) {
//                var metadata = "";
//                if (resource.metadata) {
//                  metadata = resource.metadata;
//                }
                        // append the metadata to the resource object
//                resource["metadata"] = metadata;
                        //TODO: log action
                        return cb(resource);
//              });

                    } else {
                        error = {
                            "error": "The resource is not available.",
                            "log": resource.error
                        };
                        return cb(error);
                    }
                });
            } else {
                error = {"error": "The resourceId cannot be empty. The resource couldn't be read."};
                return cb(error);
            }
        },

        // returns the metadata related to a resource by the resourceId
        getMetadata: function (resourceId, cb) {
            //counter_getMetadata++;
            //console.log("counter_getMetadata " + counter_getMetadata);
            var error = {};
            if (resourceId && resourceId != "") {
                osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function (resource) {
                    if (!resource.error) {
                        //TODO: those resources without metadada should be enriched based on the actions registered
                        //ils.getAction(resource.parentId, resourceId, function (action) {
                        if (resource.metadata) {
                            return cb(JSON.parse(resource.metadata));
                        } else {
                            error = {"error": "The resource has no metadata."};
                            return cb(error);
                        }
                        //});
                    } else {
                        error = {
                            "error": "The resource is not available.",
                            "log": resource.error
                        };
                        return cb(error);
                    }
                });
            } else {
                error = {"error": "The resourceId cannot be empty. The metadata couldn't be obtained."};
                return cb(error);
            }
        },

        // returns the basic metadata inferred from the history
        obtainMetadataFromAction: function (metadata, action, parentIls) {
            //counter_obtainMetadataFromAction++;
            //console.log("counter_obtainMetadataFromAction " + counter_obtainMetadataFromAction);
            var extendedMetadata = "";
            if (metadata) {
                extendedMetadata = JSON.parse(metadata);
            } else {
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
            if (parentIls) {
                extendedMetadata.provider = {
                    url: parentIls.profileUrl,
                    id: parentIls.id,
                    displayName: parentIls.displayName
                };
            }
            return (extendedMetadata);
        },

        validateMetadata: function (metadata, cb){
            if (!metadata) return cb();

            if (typeof metadata === 'string') {
                try {
                    metadata = JSON.parse(metadata);
                }
            }

            if (typeof metadata !== 'object') {
                error = {
                    "error": "The metadata is not valid. It cannot be parsed as a JSON object."
                };
                return cb(error);
            }

            return cb(null, metadata);
        },

        // create a resource in the Vault, resourceName and content need to be passed
        // resourceName should be in string format, metadata and content should be in JSON format
        createResource: function (resourceName, content, metadata, cb) {
            //counter_createResource++;
            //console.log("counter_createResource " + counter_createResource);
            var error = {};
            if (resourceName) {
                ils.getContextFromMetadata(metadata, function () {
                    ils.getUniqueName(resourceName, function (uniqueName) {
                        ils.validateMetadata(metadata, function (err, validMetadata) {
                            if (err) return cb(err);

                            var params = {
                                "document": {
                                    "parentType": context.storageType,
                                    "parentSpaceId": context.storageId,
                                    "mimeType": "txt",
                                    "fileName": uniqueName,
                                    "content": JSON.stringify(content),
                                    "metadata": validMetadata
                                }
                            };

                            osapi.documents.create(params).execute(function (resource) {
                                if (resource && !resource.error && resource.id) {
                                    return cb(resource);
                                } else {
                                    //TODO verify error types and return "The resourceName already exists in the space." when it happens
                                    error = {
                                        "error": "The resource couldn't be created.",
                                        "log": resource.error
                                    };
                                    return cb(error);
                                }
                            });
                        });
                    });
                });
            } else {
                error = {"error": "The resourceName cannot be empty. The resource couldn't be created."};
                return cb(error);
            }
        },

        // ensure unique filenames
        getUniqueName: function (resourceName, cb) {
            //counter_getUniqueName++;
            //console.log("counter_getUniqueName " + counter_getUniqueName);
            ils.getCurrentUser(function (username) {
                var timeStamp = new Date().getTime();
                var uniqueName = username + "_" + timeStamp + "_" + resourceName;
                return cb(uniqueName);
            });
        },


        //Returns the Configuration Space based on the VaultId
        getConfiguration: function (cb) {
            //counter_getConfiguration++;
            //console.log("counter_getConfiguration " + counter_getConfiguration);
            var error = {};

            ils.getApp(function (app) {
                if (app.metadata && app.metadata.settings) {
                    ils.getIlsId( function(ilsId) { //phaseId, phaseType, phaseName
                        return cb(ils.getFixedConfiguration(app.id, app.displayName, app.appUrl, app.metadata.settings, context.provider.inquiryPhaseId, context.provider.inquiryPhase, context.provider.inquiryPhaseName));
                    });
                } else {
                    error = {
                        "error": "The configuration could not be saved.",
                        "log": app.error || ""
                    };
                    return cb(error);
                }
            });

        },


        //Returns all the configurations of the apps added to the ILS
        getAllConfigurations: function (cb) {
            //counter_getAllConfigurations++;
            //console.log("counter_getAllConfigurations " + counter_getAllConfigurations);
            var error = {};
            var ilsConfigurations = [];
            ils.getIlsId(function(ilsId){
                ils.getAppsBySpaceId(ilsId, function(spaceApps) {
                    if (!spaceApps.error) {
                        _.each(spaceApps, function(app, i) {
                            if(app.metadata && app.metadata.settings) {
                                var configuration = ils.getFixedConfiguration(app.id, app.displayName, app.appUrl, app.metadata.settings, "undefined", "undefined", "undefined");
                                if (configuration) {
                                    ilsConfigurations.push(configuration);
                                }
                            }
                        });
                    } else {
                        console.warn("retrieving the space's apps returned an error:");
                        console.warn(spaceApps.error);
                    }
                    ils.getSubspacesBySpaceId(ilsId, function(subspaceList) {
                        if (!subspaceList.error) {

                            // define the promise function to retrieve the configurations from a subspace
                            function retrieveSubspaceConfigurations(subspace) {
                                var deferred = new $.Deferred();
                                ils.getAppsBySpaceId(subspace.id, function(subspaceApps) {
                                    if(!subspaceApps.error){
                                        _.each(subspaceApps, function (app, k) {
                                            if (app.metadata && app.metadata.settings) {
                                                var phaseId = subspace.id;
                                                var phaseName = subspace.displayName;
                                                var phaseType = "undefined";
                                                if (subspace.metadata && subspace.metadata.type) {phaseType=subspace.metadata.type;}
                                                var configuration = ils.getFixedConfiguration(app.id, app.displayName, app.appUrl, app.metadata.settings, phaseId, phaseType, phaseName);
                                                if (configuration) {
                                                    ilsConfigurations.push(configuration);
                                                }
                                            }
                                        });
                                    } else {
                                        console.warn("retrieving subspace apps for space "+subspace.id+" returned an error:");
                                        console.warn(subspaceApps.error);
                                    }
                                    deferred.resolve();
                                });
                                return deferred.promise();
                            }

                            // create array of promises
                            var retrieveAppConfigurationPromises = []
                            _.each(subspaceList, function (subspace, j) {
                                retrieveAppConfigurationPromises.push(retrieveSubspaceConfigurations(subspace));
                            });
                            // execute the promises
                            $.when.apply($, retrieveAppConfigurationPromises).done(function() {
                                // all app configurations have been collected
                                return cb(ilsConfigurations);
                            });

                        } else {
                            console.warn("retrieving the subspaces returned an error:");
                            console.warn(subspaceList.error);
                            // cannot continue from here -> callback
                            return cb(ilsConfigurations);
                        }
                    });
                });
            });
        },

        getFixedConfiguration: function (appId, appName, appUrl, appSettings, phaseId, phaseType, phaseName) {
            try {
                var intrinsicMetadada = (typeof appSettings === 'string') ? JSON.parse(appSettings) : appSettings;

                var content;
                try {
                    content = JSON.parse(intrinsicMetadada.content);
                } catch (error) {
                    content = intrinsicMetadada.content
                }

                var configuration = {
                    "metadata": {
                        "actor": intrinsicMetadada.actor || {},
                        "id": intrinsicMetadada.id || "",
                        "published": intrinsicMetadada.published || "",
                        "target": intrinsicMetadada.target || {}
                    },
                    "content": content
                };

                configuration.metadata.generator = {
                    "displayName": appName,
                    "id": appId,
                    "objectType": "application",
                    "url": appUrl
                };

                configuration.metadata.provider = {
                    "displayName": context.provider.displayName,
                    "id": context.provider.id,
                    "inquiryPhase": phaseType,
                    "inquiryPhaseId": phaseId,
                    "inquiryPhaseName": phaseName,
                    "objectType": context.provider.objectType,
                    "url": context.provider.url
                }

                configuration.metadata.storageId = context.storageId;
                configuration.metadata.storageType = context.storageType;

                return configuration;
            } catch(error) {
                console.warn("error during JSON-parsing of the following configuration:");
                console.warn(appSettings);
                console.warn(error);
                return undefined;
            }
        },

        // sets the configuration of the app, content and metadata need to be passed
        // content should be in JSON format
        setAppConfiguration: function (content, metadata, cb) {
            //counter_setAppConfiguration++;
            //console.log("counter_setAppConfiguration " + counter_setAppConfiguration);
            var error = {};

            ils.validateConfiguration(metadata, function(isValid){
                if (isValid && !isValid.error){
                    ils.getApp(function (app) {
                        if (app && !app.error) {
                            var appParams = {
                                "contextId": app.id,
                                "application": {
                                    "metadata": app.metadata || {}
                                }
                            };

                            var configuration = {
                                "actor": metadata.actor,
                                "id": metadata.id,
                                "published": metadata.published ,
                                "target": metadata.target,
                                "content": (typeof content === 'string') ? content : JSON.stringify(content)
                            };

                            appParams.application.metadata.settings = configuration;

                            osapi.apps.update(appParams).execute(function (response) {
                                if (!response.error) {
                                    console.log("The app configuration has been saved: ");
                                    console.log(response);
                                    return cb(response);
                                } else {
                                    console.log("The app configuration couldn't saved: ");
                                    console.log(response);
                                    error = {
                                        "error": "The configuration couldn't be saved.",
                                        "log": response.error
                                    };
                                    return cb(error);
                                }
                            });
                        } else {
                            return cb(app);
                        }
                    });
                }else{
                    return cb(isValid.error);
                }
            });
        },

        // verifies the confituration metadata
        validateConfiguration: function (metadata, cb){
            if (metadata && metadata.actor && metadata.id && metadata.published && metadata.target &&
                (typeof metadata.actor === 'object') && (typeof metadata.id === 'string') &&
                (typeof metadata.published === 'string') && (typeof metadata.target === 'object')) {
                return cb(true);
            }else {
                var error = {
                    "error": "The metadata is not compliant."
                };
                return cb(error);
            }
        },

        // updates a resource in the Vault, resourceId, content and metadata need to be passed
        // content should be in JSON format
        updateResource: function (resourceId, content, metadata, cb) {
            //counter_updateResource++;
            //console.log("counter_updateResource " + counter_updateResource);
            var error = {};
            if (resourceId) {
                ils.readResource(resourceId, function (originalResource) {
                    if (originalResource && !originalResource.error && originalResource.displayName) {
                        ils.getContextFromMetadata(metadata, function () {
                            var newContent = "";

                            if (content) {
                                newContent = JSON.stringify(content);
                            }

                            ils.validateMetadata(metadata, function (err, validMetadata) {
                                if (err) return cb(err);

                                var params = {
                                    "contextId": resourceId,
                                    "document": {
                                        "parentType": context.storageType,
                                        "parentSpaceId": context.storageId,
                                        "mimeType": "txt",
                                        "fileName": originalResource.displayName,
                                        "content": newContent,
                                        "metadata": validMetadata
                                    }
                                };

                                osapi.documents.update(params).execute(function (resource) {
                                    if (resource && !resource.error && resource.id) {
                                        return cb(resource);
                                    } else {
                                        error = {
                                            "error": "The resource couldn't be updated.",
                                            "log": resource.error
                                        };
                                        return cb(error);
                                    }
                                });
                            });
                        });
                    } else {
                        error = {
                            "error": "The resource couldn't be updated.",
                            "log": originalResource.error
                        };
                        return cb(error);
                    }
                });
            } else {
                error = {"error": "The resourceName cannot be null. The resource couldn't be updated."};
                return cb(error);
            }
        },

        // get a list of all resources in the Space
        listFilesBySpaceId: function (spaceId, cb) {
            //counter_listFilesBySpaceId++;
            //console.log("counter_listFilesBySpaceId " + counter_listFilesBySpaceId);
            var error = {"error": "The spaceId cannot be empty."};
            if (spaceId && spaceId != "") {
                osapi.documents.get({contextId: spaceId, contextType: "@space"}).execute(function (resources) {
                    if (resources.list)
                        return cb(resources.list);
                    else
                        return cb(error);
                });
            } else {
                return cb(error);
            }
        },

        // get a list of all resources in the Vault
        listVault: function (cb) {
            //counter_listVault++;
            //console.log("counter_listVault " + counter_listVault);
            ils.getVault(function (space) {
                if (!space.error) {
                    ils.listFilesBySpaceId(space.id, function (list) {
                        return cb(list);
                    });
                } else {
                    return cb(space.error);
                }
            });
        },

        // get a list of all resources in the Vault
        listConfiguration: function (cb) {
            //counter_listConfiguration++;
            //console.log("counter_listConfiguration " + counter_listConfiguration);
            ils.getConfiguration(function (space) {
                if (!space.error) {
                    ils.listFilesBySpaceId(space.id, function (list) {
                        return cb(list);
                    });
                } else {
                    return cb(space.error);
                }
            });
        },

        // get a list of all resources in the Vault
        listVaultNames: function (cb) {
            //counter_listVaultNames++;
            //console.log("counter_listVaultNames " + counter_listVaultNames);
            var nameList = [];
            ils.listVault(function (resourceList) {
                if (!resourceList.error) {
                    for (i = 0; i < resourceList.length; i++) {
                        nameList.push(resourceList[i].displayName);
                    }
                    return cb(nameList);
                } else {
                    return cb(resourceList.error);
                }
            });
        },

        // get a list of all resources in the Configuration
        listConfigurationNames: function (cb) {
            //counter_listConfigurationNames++;
            //console.log("counter_listConfigurationNames " + counter_listConfigurationNames);
            var nameList = [];
            ils.listConfiguration(function (resourceList) {
                if (!resourceList.error) {
                    for (i = 0; i < resourceList.length; i++) {
                        nameList.push(resourceList[i].displayName);
                    }
                    return cb(nameList);
                } else {
                    return cb(resourceList.error);
                }
            });
        },

        // get a list of all resources in the Vault including all the metadata extracted from the actions
        listVaultExtended: function (cb) {
            //counter_listVaultExtended++;
            //console.log("counter_listVaultExtended " + counter_listVaultExtended);
            var error = {"error": "No resource available in the Vault."};
            ils.getVault(function (vault) {
                osapi.documents.get({contextId: vault.id, contextType: "@space"}).execute(function (resources) {
                    if (resources.list) {
                        return cb(resources.list);
                    } else {
                        return cb(error);
                    }
                });
            });
        },


        // get a list of all resources in the Vault (including all the metadata extracted from the actions) based on the VaultId
        listVaultExtendedById: function (vaultId, cb) {
            //counter_listVaultExtendedById++;
            //console.log("counter_listVaultExtendedById " + counter_listVaultExtendedById);
            var error = {"error": "No resource available in the Vault."};
            if (vaultId && vaultId != "") {
                osapi.documents.get({contextId: vaultId, contextType: "@space"}).execute(function (resources) {
                    if (resources.list) {
                        return cb(resources.list);
                    } else {
                        return cb(error);
                    }
                });
            } else {
                error = {"error": "The Vault identifier cannot be empty. The files could not be obtained"};
                return cb(error);
            }
        },


        /**
         * Finds all those vault resources compliant with the filters
         * @param  {string} vaultId  the id of the Vault space where the resources are stored, equivalent to storageId (mandatory)
         * @param  {string} userId  the user who created the resources (optional)
         * @param  {string} appId  the app that creates the resources, equivalent to generator.id (optional)
         * @param  {string} objectType  the objectType specified in the resource, equivalent to metadata.target (optional)
         * @param  {string} creationDateFrom mininum date for the resource creation according to UTC (optional)
         * @param  {string} creationDateTo  maximum date for the resource creation according to UTC(optional)
         * @param  {string} lastModificationDateFrom mininum date for the resource modification according to UTC (optional)
         * @param  {string} lastModificationDateTo   maximum date for the resource modificaiton according to UTC (optional)
         * @param  {Function} cb  callback
         */
        filterVault: function (vaultId, userId, appId, objectType,
                               creationDateFrom, creationDateTo, lastModificationDateFrom, lastModificationDateTo,
                               cb) {
            //counter_filterVault++;
            //console.log("counter_filterVault " + counter_filterVault);
            var error = {"error": "No resource available in the Vault."};

            if (vaultId) {
                var filters = {};
                if (userId) { filters["creator"] = userId ;}
                if (appId) { filters["metadata.generator.id"] = appId;}
                if (objectType) { filters["metadata.target.objectType"] = objectType;}

                var params = {
                    contextId: vaultId,
                    contextType: "@space"
                };

                if (Object.keys(filters).length > 0) {params.filters = filters}
                if (creationDateFrom && Date.parse(creationDateFrom) !== NaN) { params.createdSince = creationDateFrom;}
                if (creationDateTo && Date.parse(creationDateTo) !== NaN) { params.createdUntil = creationDateTo;}
                if (lastModificationDateFrom && Date.parse(lastModificationDateFrom) !== NaN) { params.modifiedSince = lastModificationDateFrom;}
                if (lastModificationDateTo && Date.parse(lastModificationDateTo) !== NaN) { params.modifiedUntil = lastModificationDateTo;}


                if (params.filters || params.createdSince || params.createdUntil || params.modifiedSince
                    || params.modifiedUntil) {
                    osapi.documents.get(params).execute(function (resources) {
                        if (resources.list) {
                            return cb(resources.list);
                        } else {
                            return cb(error);
                        }
                    });
                } else{
                    error = {"error": "No filter has been provided"};
                    return cb(error);
                }
            } else {
                error = {"error": "The Vault identifier cannot be empty. The files could not be obtained"};
                return cb(error);
            }
        },

        // log the action of adding a resource in the Vault
        logAction: function (objectId, objectType, objectName, spaceId, spaceName, actionType, cb) {
            //counter_logAction++;
            //console.log("counter_logAction " + counter_logAction);
            var params = {
                "userId": "@viewer",
                "groupId": "@self",
                "published": new Date().toISOString(),
                "verb": actionType,
                "activity": {}
            };

            params.activity.verb = actionType;

            params.activity.published = params.published;

            params.activity.object = {
                "id": objectId,
                "objectType": objectType,
                "displayName": objectName
            };

            params.activity.target = {
                "id": spaceId,
                "objectType": "Space",
                "displayName": spaceName
            };

            params.activity.generator = context.generator;

            params.activity.actor = context.actor;

            params.activity.provider = context.provider;

            osapi.activitystreams.create(params).execute(function (response) {
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

        },

        // get the action of adding the resource in the Vault based on resourceId and vaultId
        getAction: function (vaultId, resourceId, cb) {
            //counter_getAction++;
            //console.log("counter_getAction " + counter_getAction);
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
            osapi.activitystreams.get(params).execute(function (response) {
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
