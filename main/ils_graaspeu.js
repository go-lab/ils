/*
 ILS Library for Go-Lab
 author: María Jesús Rodríguez-Triana, Wissam Halimi
 contact: maria.rodrigueztriana@epfl.ch
 requirements: this library uses jquery
 */


(function () {

    var ils;
    /*
     Possible contexts using the library
     */
    var context_graasp = "graasp";
    var context_preview = "preview";
    var context_standalone_ils = "standalone_ils";
    var context_standalone_html = "standalone_html";
    var context_unknown = "unknown";
    /*
    User types interacting with the apps
     */
    var user_student = "graasp_student";
    var user_viewer = "graasp_viewer";
    var user_editor = "graasp_editor";
    /*
     ILS contextual information
     */
    var context = {
        actor: {
            "objectType": "person",
            "id": null,
            "displayName": null,
            "lang": null
        },
        generator: {
            "objectType": "application",
            "url": (typeof gadgets != "undefined") ? gadgets.util.getUrlParameters().url : window.location.href,
            "id": null,
            "displayName": null,
            "hidden": null,
            "visibility": null,
            "configuration": null
        },

        provider: {
            "objectType": context_preview,
            "url": window.location.href,
            "id": null,
            "lang": null,
            "displayName": null,
            "hidden": null,
            "access":null,
            "ilsHasAngeLA": null,
            "ilsHasAngeLO": null,
            "inquiryPhaseId": "undefined",
            "inquiryPhaseName": "undefined",
            "inquiryPhase": "undefined",
            "inquiryHidden": "undefined",
            "inquiryVisibility": "undefined",
            "inquiryPhaseHasAngeLA": null,
            "inquiryPhaseHasAngeLO": null
        },

        target: {},

        "storageId": null,
        "storageType": null

    };

    /*
    Debugging vars counting the number of calls to each function.
    Set debugging as true to print the number of calls.
     */
    var debugging = true;
    var counter_getCurrentUser = 0;
    var counter_identifyContext = 0;
    var counter_getParent = 0;
    var counter_getParentInquiryPhase = 0;
    var counter_getIls = 0;
    var counter_getIlsId = 0;
    var counter_getSpaceBySpaceId = 0;
    var counter_getItemsBySpaceId = 0;
    var counter_getSubspacesBySpaceId = 0;
    var counter_getAppsBySpaceId = 0;
    var counter_getVault = 0;
    var counter_getVaultByIlsId = 0;
    var counter_getApp = 0;
    var counter_getAppId = 0;
    var counter_getContextFromMetadata = 0;
    var counter_getAppContextParameters = 0;
    var counter_deleteResource = 0;
    var counter_existResource = 0;
    var counter_readResource = 0;
    var counter_getMetadata = 0;
    var counter_obtainMetadataFromAction = 0;
    var counter_createResource = 0;
    var counter_getUniqueName = 0;
    var counter_getConfiguration = 0;
    var counter_getAllConfigurations = 0;
    var counter_setAppConfiguration = 0;
    var counter_updateResource = 0;
    var counter_listFilesBySpaceId = 0;
    var counter_listVault = 0;
    var counter_filterVault = 0;
    var counter_listConfiguration = 0;
    var counter_listVaultNames = 0;
    var counter_listConfigurationNames = 0;
    var counter_listVaultExtended = 0;
    var counter_listVaultExtendedById = 0;
    var counter_logAction = 0;
    var counter_getAction = 0;

    ils = {

        /**
         * Returns the nickname of the logged user
         *
         */
        getLoggedUser: function (cb) {
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
        },

        /**
         * Returns the reviewer in case of existing
         * @param cb
         * @returns reviewer
         */
        getReviewer: function (cb) {
            var reviewer;
            if (gadgets.util.getUrlParameters()['view-params'] && JSON.parse(gadgets.util.getUrlParameters()['view-params'])) {
                var view_params = JSON.parse(gadgets.util.getUrlParameters()['view-params']);
                reviewer = (view_params) ? view_params.reviewer : null;
                return cb(reviewer);
            }
        },

        /**
         * Returns an object with the id and the displayname of the student who is currently using the ils
         * @param cb
         */
        getCurrentUser: function (cb) {
            if (debugging) {
                counter_getCurrentUser++;
                console.log("counter_getCurrentUser " + counter_getCurrentUser);
            }
            var error = {"error": "The username couldn't be obtained."};
            var context_type = ils.identifyContext();



            //get the user logged in the Graasp
            ils.getLoggedUser(function(logged_user){
                if (!logged_user.error) {
                    ils.getReviewer(function (reviewer) {
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

        /**
         * Returns the type of context where the app is running
         * @returns context_type
         */
        identifyContext: function () {
            if (debugging) {
                counter_identifyContext++;
                console.log("counter_identifyContext " + counter_identifyContext);
            }

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

        /**
         * Returns the parent space of the widget
         * @param cb
         */
        getParent: function (cb) {
            if (debugging) {
                counter_getParent++;
                console.log("counter_getParent " + counter_getParent);
            }
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

        /**
         * Returns the type of inquiry phase where the app is running in
         * @param cb
         */
        getParentInquiryPhase: function (cb) {
            if (debugging) {
                counter_getParentInquiryPhase++;
                console.log("counter_getParentInquiryPhase " + counter_getParentInquiryPhase);
            }

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

        /**
         * Returns the spaceId of the ILS and the parent space of the current app and sets the context.provider attributes
         * @param cb
         */
        getIls: function (cb) {
            if (debugging) {
                counter_getIls++;
                console.log("counter_getIls " + counter_getIls);
            }

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

        /**
         * Returns the the spaceId of the current ILS
         * @param cb
         * @returns space
         */
        getIlsId: function (cb) {
            if (debugging) {
                counter_getIlsId++;
                console.log("counter_getIlsId " + counter_getIlsId);
            }

            var ilsId = context.provider.id;

            if (!ilsId){
                ils.getIls(function(space){
                    return cb(space.id);
                });
            }else{
                return cb(ilsId);
            }
        },

        /**
         * Returns the space attributes of a given spaceId
         * @param spaceId
         * @param cb
         */
        getSpaceBySpaceId: function (spaceId, cb) {
            if (debugging) {
                counter_getSpaceBySpaceId++;
                console.log("counter_getSpaceBySpaceId " + counter_getSpaceBySpaceId);
            }

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

        /**
         * Returns the subitems of a given spaceId
         * @param spaceId
         * @param cb
         */
        getItemsBySpaceId: function (spaceId, cb) {
            if (debugging) {
                counter_getItemsBySpaceId++;
                console.log("counter_getItemsBySpaceId " + counter_getItemsBySpaceId);
            }

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

        /**
         * Returns the subspaces of a given spaceId
         * @param spaceId
         * @param cb
         */
        getSubspacesBySpaceId: function (spaceId, cb) {
            if (debugging) {
                counter_getSubspacesBySpaceId++;
                console.log("counter_getSubspacesBySpaceId " + counter_getSubspacesBySpaceId);
            }

            var error;
            var filters = {};
            filters["_type"] = "Space";
            osapi.spaces.get({contextId: spaceId, contextType: "@space", filters: filters}).execute(function (spaces) {
                if (!spaces.error && spaces.list) {
                    return cb(spaces.list);
                } else {
                    error = {
                        "error": "The list of spaces could not be obtained.",
                        "log": spaces.error
                    };
                    return cb(error);
                }
            });
        },

        /**
         * Returns the list of apps located in a given space based on the spaceId
         * @param spaceId
         * @param cb
         */
        getAppsBySpaceId: function (spaceId, cb) {
            if (debugging) {
                counter_getAppsBySpaceId++;
                console.log("counter_getAppsBySpaceId " + counter_getAppsBySpaceId);
            }

            var error;
            var filters = {};
            filters["_type"] = "Application";
            osapi.spaces.get({contextId: spaceId, contextType: "@space", filters: filters}).execute(function (apps) {
                if (!apps.error && apps.list) {
                    return cb(apps.list);
                } else {
                    error = {
                        "error": "The list of apps could not be obtained.",
                        "log": apps.error
                    };
                    return cb(error);
                }
            });
        },

        /**
         * Returns the Vault space of the current ILS.
         * If there's no Vault, an error is returned.
         * @param cb
         */
        getVault: function (cb) {
            if (debugging) {
                counter_getVault++;
                console.log("counter_getVault " + counter_getVault);
            }

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

        /**
         * Returns the Vault space of a given space (based on the spaceId) and sets the context.storage values
         * If there's no Vault, an error is returned.
         * @param ilsId
         * @param cb
         * @returns {*}
         */
        getVaultByIlsId: function (ilsId, cb) {
            if (debugging) {
                counter_getVaultByIlsId++;
                console.log("counter_getVaultByIlsId " + counter_getVaultByIlsId);
            }

            var error;
            if (ilsId && ilsId != "") {
                var filters = {};
                filters["_type"] = "Space";
                filters["metadata.type"] = "Vault";
                osapi.spaces.get({contextId: ilsId, contextType: "@space", filters: filters}).execute(function (spaces) {
                    if (!spaces.error && spaces.list) {
                       if (spaces.list.length==1) {
                           var vault = spaces.list[0];
                            context.storageId = vault.id;
                            context.storageType = vault.spaceType;
                            return cb(vault);
                        } else if(spaces.list.length==0) {
                            error = {"error": "There is no Vault available."};
                            return cb(error);
                        } else {
                            error = {"error": "There is more that one Vault available."};
                            return cb(error);
                        }
                    } else {
                        error = {
                            "error": "The list of spaces could not be obtained.",
                            "log": spaces.error
                        };
                        return cb(error);
                    }
                });
            } else {
                error = {"error": "There ILS identifier cannot be empty. The Vault space could not be obtained"};
                return cb(error);
            }
        },

        /**
         * Returns the attributes of the current app and sets the context.generator and context.actor values
         * @param cb
         */
        getApp: function (cb) {
            if (debugging) {
                counter_getApp++;
                console.log("counter_getApp " + counter_getApp);
            }

            osapi.apps.get({contextId: "@self"}).execute(function (response) {
                if (!response.error && response.id) {
                    context.generator.url = response.appUrl;
                    context.generator.id = response.id;
                    context.generator.displayName = response.displayName;
                    context.hasAngeLA = (response.hasAngeLA) ? response.hasAngeLA : false;
                    context.hasAngeLO = (response.hasAngeLO) ? response.hasAngeLO : false;
                    if (ils.identifyContext() != context_standalone_ils){
                        if (response.userMemberType === "owner" || response.userMemberType === "contributor"){
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

        /**
         * Returns the current appId
         * @param cb
         */
        getAppId: function (cb) {
            if (debugging) {
                counter_getAppId++;
                console.log("counter_getAppId " + counter_getAppId);
            }

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

        /**
         * Obtains the parameters that describe the context of the app (actor, generator, provider, target)
         * and sets context.actor, context.provider, context.generator and context provider attributes
         * @param metadata
         * @param cb
         * @returns cb
         */
        getContextFromMetadata: function (metadata, cb) {
            if (debugging) {
                counter_getContextFromMetadata++;
                console.log("counter_getContextFromMetadata " + counter_getContextFromMetadata);
            }

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

        /**
         * Returns the parameters that describe the context of the app (actor, generator, provider, target)
         * @param cb
         * @returns context
         */
        getAppContextParameters: function (cb) {
            if (debugging) {
                counter_getAppContextParameters++;
                console.log("counter_getAppContextParameters " + counter_getAppContextParameters);
            }

            if (context.actor.id && context.generator.id && context.provider.id && context.storageId) {
                return cb(context);
            } else {
                osapi.apps.get({contextId: "@self", params: {initialize:true}}).execute(function (response) {
                    if (response && !response.error) {
                        var context_application = (response.application) ? response.application : null;
                        var context_ils = (response.ils) ? response.ils : null;
                        var context_phase = (response.phase) ? response.phase : null;
                        var context_user = (response.user) ? response.user : null;
                        var context_vaults = (response.vaults) ? response.vaults : null;
                        var context_type = ils.identifyContext();

                        function getContextUser(cb){
                            if (context_user){
                                /*
                                 * authoring view: returns the current user
                                 * review mode: returns the standalone user
                                 */
                                //get the user logged in the Graasp
                                var logged_user = {
                                    "id": (context_user._id) ? context_user._id : null,
                                    "displayName": (context_user.name) ? context_user.name : null
                                }

                                ils.getReviewer(function (reviewer) {
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

                                        //real or temporary users
                                    } else if (context_type == context_graasp || context_type == context_standalone_ils) {
                                        context.actor.id = logged_user.id;
                                        context.actor.displayName = logged_user.displayName;
                                        context.actor.objectType = (context_type == context_standalone_ils) ? user_student : "person";
                                        context.actor.lang = (context_user.language) ? (context_user.language) : null;

                                    } else {
                                        console.log("There was an error obtaining the user(s).");
                                        console.log("logged_user\n" + logged_user);
                                        console.log("reviewer\n" + reviewer);
                                        console.log("context_type\n" + context_type);
                                    }
                                });
                                return cb(true);

                            } else {
                                console.log("The user could not be obtained.");
                                return cb(false);
                            }
                        }

                        function getContextApplication(cb) {
                            if (context_application) {
                                context.generator.url = (context_application.url) ? (context_application.url) : null;
                                context.generator.id = (context_application._id) ? (context_application._id) : null;
                                context.generator.displayName = (context_application.name) ? (context_application.name) : null;
                                context.generator.hidden = (context_application.hidden) ? (context_application.hidden) : false;
                                context.generator.visibility = (context_application.visLevel) ? (context_application.visLevel) : null;
                                context.generator.configuration = (context_application.metadata && context_application.metadata.settings) ? context_application.metadata.settings : null;

                                /*
                                 * authoring view: owner, contributor, observer or null if the user is not a member of the space
                                 * review mode: observer
                                 */
                                if (context_type != context_standalone_ils) {
                                    if (context_application.userMemberType === "owner" || context_application.userMemberType === "contributor") {
                                        context.actor.objectType = user_editor;
                                    } else {
                                        context.actor.objectType = user_viewer;
                                    }
                                }
                                return cb(true);
                            } else {
                                console.log("The app data couldn't be obtained.");
                                return cb(false);
                            }
                        }

                        function getContextIls(cb) {
                            if (context_ils) {
                                context.provider.objectType = (context_ils.metadata && context_ils.metadata.type) ? context_ils.metadata.type : null;
                                context.provider.id = (context_ils._id) ? context_ils._id : null;
                                context.provider.url = (context_ils._id) ? "http://graasp.eu/spaces/" + context_ils._id : null;
                                context.provider.displayName = (context_ils.name) ? context_ils.name : null;
                                context.provider.ilsRef = (context_ils.ilsRef) ? context_ils.ilsRef : null;
                                context.provider.lang = (context_ils.lang) ? context_ils.lang : null;
                                context.provider.hidden = (context_ils.hidden) ? (context_ils.hidden) : false;
                                context.provider.visibility = (context_ils.visLevel) ? (context_ils.visLevel) : null;
                                context.provider.ilsHasAngeLA = (context_ils.hasAngeLA) ? context_ils.hasAngeLA : false;
                                context.provider.ilshasAngeLO = (context_ils.hasAngeLO) ? context_ils.hasAngeLO : false;
                                return cb(true);
                            } else {
                                console.log("The app is not located in an ILS or in one of its phases.");
                                return cb(false);
                            }
                        }

                        function getContextPhase(cb) {
                            if (context_phase) {
                                context.provider.inquiryPhase = (context_phase.metadata && context_phase.metadata.type) ? context_phase.metadata.type : null;
                                context.provider.inquiryPhaseId = (context_phase._id) ? context_phase._id : null;
                                context.provider.inquiryPhaseName = (context_phase.name) ? context_phase.name : null;
                                context.provider.inquiryHidden = (context_phase.hidden) ? (context_phase.hidden) : false;
                                context.provider.inquiryVisibility = (context_phase.visLevel) ? (context_phase.visLevel) : null;
                                context.provider.inquiryPhaseHasAngeLA = (context_phase.hasAngeLA) ? context_phase.hasAngeLA : false;
                                context.provider.inquiryPhaseHasAngeLO = (context_phase.hasAngeLO) ? context_phase.hasAngeLO : false;
                                return cb(true);
                            } else {
                                console.log("The app is not located in an ILS phase.");
                                return cb(false);
                            }
                        }

                        function getContextVaults(cb) {
                            if (context_vaults) {
                                if (context_vaults.length == 1) {
                                    var vault = context_vaults[0];
                                    context.storageId = (context_vaults[0]._id) ? context_vaults[0]._id : null;
                                    //context.storageType = (context_vaults[0].metadata && context_vaults[0].metadata.type) ? context_vaults[0].metadata.type : null;
                                    context.storageType = (context_vaults[0].metadata && context_vaults[0].metadata.type) ? "folder" : null;
                                    return cb(true);
                                } else {
                                    if (context_vaults.length == 0) {
                                        console.log("There is no Vault available.");
                                    } else {
                                        console.log("There is more that one Vault available.");
                                    }
                                    return cb(false);
                                }

                            } else {
                                console.log("There is no Vault available.");
                                return cb(false);
                            }
                        }

                        getContextUser(function () {
                            getContextApplication(function () {
                                getContextIls(function () {
                                    getContextPhase(function () {
                                        getContextVaults(function () {
                                            debugger;
                                            return cb(context);
                                        });
                                    });
                                });
                            });
                        });


                    } else {
                        error = {
                            "error": "No context was obtained",
                            "log": (response.error) ? response.error : null
                        };
                        return cb(error);
                    }
                });

            }
        },

        /**
         * Deletes a resource by the resourceId. The result is true if the resource has been successfully deleted,
         * or an error if any problem emerged in the process.
         * Notice that only ILS owners are allowed to remove resources.
         * @param resourceId
         * @param cb
         */
        deleteResource: function (resourceId, cb) {
            if (debugging) {
                counter_deleteResource++;
                console.log("counter_deleteResource " + counter_deleteResource);
            }

            var error = {};
            ils.existResource(resourceId, function (exists) {
                if (exists) {
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
                } else {
                    error = {"error": "The resource to be deleted is not available. The resource couldn't be removed."};
                    return cb(error);
                }
            });
        },

        /**
         * Verifies whether there is a resource by the resourceId, the result is true/false depending on whether the resourceId exists or not.
         * @param resourceId
         * @param cb
         * @returns boolean
         */
        existResource: function (resourceId, cb) {
            if (debugging) {
                counter_existResource++;
                console.log("counter_existResource " + counter_existResource);
            }

            var error = {};
            if (resourceId && resourceId != "") {
                osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function (resource) {
                    if (resource && !resource.error && resource.id) {
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

        /**
         * Reads a resource by the resourceId, the result is the combination of resource content and the metadata
         * @param resourceId
         * @param cb
         * @returns resource / error depending on whether the resource is found or not
         */
        readResource: function (resourceId, cb) {
            if (debugging) {
                counter_readResource++;
                console.log("counter_readResource " + counter_readResource);
            }

            var error = {};
            if (resourceId && resourceId != "") {
                osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function (resource) {
                    if (!resource.error && resource.id) {
                        return cb(resource);
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

        /**
         * Returns the metadata related to a resource by the resourceId
         * @param resourceId
         * @param cb
         * @returns metadata / error  depending on whether the metadata is found or not
         */
        getMetadata: function (resourceId, cb) {
            if (debugging) {
                counter_getMetadata++;
                console.log("counter_getMetadata " + counter_getMetadata);
            }

            var error = {};
            if (resourceId && resourceId != "") {
                osapi.documents.get({contextId: resourceId, size: "-1"}).execute(function (resource) {
                    if (!resource.error) {
                        if (resource.metadata) {
                            return cb(JSON.parse(resource.metadata));
                        } else {
                            error = {"error": "The resource has no metadata."};
                            return cb(error);
                        }
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

        /**
         * Returns the basic metadata inferred from the history
         * @param metadata
         * @param action
         * @param parentIls
         * @returns extendedMetadata
         */
        obtainMetadataFromAction: function (metadata, action, parentIls) {
            if (debugging) {
                counter_obtainMetadataFromAction++;
                console.log("counter_obtainMetadataFromAction " + counter_obtainMetadataFromAction);
            }

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

        /**
         * Verifies if the metadata is an object or a string (parseable as a json). If not, an error is returned
         * @param metadata
         * @param cb
         * @returns metadata / error
         */
        validateMetadata: function (metadata, cb){
            if (!metadata) return cb();

            var error = {
                "error": "The metadata is not valid. It cannot be parsed as a JSON object."
            };

            if (typeof metadata === 'string') {
                try {
                    metadata = JSON.parse(metadata);
                }catch (err) {
                    return cb(error);
                }
            }

            if (typeof metadata !== 'object') {
                return cb(error);
            }

            return cb(null, metadata);
        },

        /**
         * Creates a resource in the Vault and returns either the resource of an error if it was not possible to create the resource.
         * @param resourceName (mandatory) in string format
         * @param content (mandatory) in JSON format
         * @param metadata (optional) in JSON format
         * @param cb
         * @returns resource / error
         */
        createResource: function (resourceName, content, metadata, cb) {
            if (debugging) {
                counter_createResource++;
                console.log("counter_createResource " + counter_createResource);
            }

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

        /**
         * Returns unique filenames by appending the userName and the timeStamp at the beginning of the resourceName
         * @param resourceName
         * @param cb
         */
        getUniqueName: function (resourceName, cb) {
            if (debugging) {
                counter_getUniqueName++;
                console.log("counter_getUniqueName " + counter_getUniqueName);
            }

            ils.getCurrentUser(function (username) {
                var timeStamp = new Date().getTime();
                var uniqueName = username + "_" + timeStamp + "_" + resourceName;
                return cb(uniqueName);
            });
        },

        /**
         * Returns the configuraiton of the current app or an error if it couldn't be obtained
         * @param cb
         */
        getConfiguration: function (cb) {
            if (debugging) {
                counter_getConfiguration++;
                console.log("counter_getConfiguration " + counter_getConfiguration);
            }

            var error = {};

            function obtainConfiguration(){
                if (context.generator.configuration) {
                    return (ils.getFixedConfiguration(context.generator.id, context.generator.displayName, context.generator.url, context.generator.configuration, context.provider.inquiryPhaseId, context.provider.inquiryPhase, context.provider.inquiryPhaseName));
                } else {
                    error = {
                        "error": "The configuration could not be obtained.",
                        "log": app.error || ""
                    };
                    return (error);
                }
            }

            if(context.generator.id){
                return cb(obtainConfiguration());
            } else {
                ils.getAppContextParameters(function(contextParameters){
                    return cb(obtainConfiguration());
                });
            }

        },

        /**
         * Returns all the configurations of the apps added to the ILS
         * @param cb
         */
        getAllConfigurations: function (cb) {
            if (debugging) {
                counter_getAllConfigurations++;
                console.log("counter_getAllConfigurations " + counter_getAllConfigurations);
            }

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

        /**
         * Returns the app configuration based on its attributes
         * @param appId
         * @param appName
         * @param appUrl
         * @param appSettings
         * @param phaseId
         * @param phaseType
         * @param phaseName
         * @returns configuration or undefined depending on whether the process finished successfully or not
         */
        getFixedConfiguration: function (appId, appName, appUrl, appSettings, phaseId, phaseType, phaseName) {
            try {
                var intrinsicMetadata = (typeof appSettings === 'string') ? JSON.parse(appSettings) : appSettings;

                var content;
                try {
                    content = JSON.parse(intrinsicMetadata.content);
                } catch (error) {
                    content = intrinsicMetadata.content
                }

                var configuration = {
                    "metadata": {
                        "actor": intrinsicMetadata.actor || {},
                        "id": intrinsicMetadata.id || "",
                        "published": intrinsicMetadata.published || "",
                        "target": intrinsicMetadata.target || {}
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

        /**
         * Sets the configuration of the app, content and metadata need to be passed
         * @param content (mandatory)
         * @param metadata (mandatory)
         * @param cb
         * @returns the app or an error depending on whether the process finished successfully or not
         */
        setAppConfiguration: function (content, metadata, cb) {
            if (debugging) {
                counter_setAppConfiguration++;
                console.log("counter_setAppConfiguration " + counter_setAppConfiguration);
            }

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

        /**
         * Verifies the configuration metadata
         * @param metadata
         * @param cb
         * @returns true or an error depending on whether the metadata was compliant or not
         */
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

        /**
         * Updates a resource in the Vault
         * @param resourceId (mandatory)
         * @param content (mandatory) in JSON format
         * @param metadata (mandatory)
         * @param cb
         * @returns updatedResource or error depending on whether the resource was updated or not
         */
        updateResource: function (resourceId, content, metadata, cb) {
            if (debugging) {
                counter_updateResource++;
                console.log("counter_updateResource " + counter_updateResource);
            }

            var error = {};
            if (resourceId) {
                ils.getContextFromMetadata(metadata, function () {
                    var newContent = (content) ? JSON.stringify(content) : "";

                    ils.validateMetadata(metadata, function (err, validMetadata) {
                        if (err) return cb(err);

                        var params = {
                            "contextId": resourceId,
                            "document": {
                                "parentType": context.storageType,
                                "parentSpaceId": context.storageId,
                                "mimeType": "txt",
                                "fileName": validMetadata.target.displayName,
                                "content": newContent,
                                "metadata": validMetadata
                            }
                        };

                        osapi.documents.update(params).execute(function (resource) {
                            if (resource && !resource.error && resource.id) {
                                return cb(resource);
                            } else {
                                error = {
                                    "error": "The resource couldn't be updated. Check if the resource exist and you have enough permits.",
                                    "log": resource.error
                                };
                                return cb(error);
                            }
                        });
                    });
                });
            } else {
                error = {"error": "The resourceId cannot be null. The resource couldn't be updated."};
                return cb(error);
            }
        },

        /**
         * Returns a list of all resources in a space based on its spaceId
         * @param spaceId
         * @param cb
         * @returns resourceList or error depending on whether the space was accessible or not
         */
        listFilesBySpaceId: function (spaceId, cb) {
            if (debugging) {
                counter_listFilesBySpaceId++;
                console.log("counter_listFilesBySpaceId " + counter_listFilesBySpaceId);
            }

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


        /**
         * Returns a list of all resources in the Vault
         * @param cb
         * @returns resourceList or error depending on whether the space was accessible or not
         */
        listVault: function (cb) {
            if (debugging) {
                counter_listVault++;
                console.log("counter_listVault " + counter_listVault);
            }

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

        /**
         * Returns the list of configurations in the ILS [Deprecated]
         * @param cb
         * @returns configurationList or error depending on whether the information was accessible or not
         */
        listConfiguration: function (cb) {
            if (debugging) {
                counter_listConfiguration++;
                console.log("counter_listConfiguration " + counter_listConfiguration);
            }

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

        /**
         * Returns the names list of all resources in the Vault
         * @param cb
         * @returns resourceList or an error if it is not possible to access the Vault space
         */
        listVaultNames: function (cb) {
            if (debugging) {
                counter_listVaultNames++;
                console.log("counter_listVaultNames " + counter_listVaultNames);
            }

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

        /**
         * Gets a list of all resources in the Configuration [Deprecated]
         * @param cb
         */
        listConfigurationNames: function (cb) {
            if (debugging) {
                counter_listConfigurationNames++;
                console.log("counter_listConfigurationNames " + counter_listConfigurationNames);
            }

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

        /**
         * Gets a list of all resources in the Vault space of the current ILS
         * @param cb
         * @returns resourceList or an error if it is not possible to access the Vault space
         */
        listVaultExtended: function (cb) {
            if (debugging) {
                counter_listVaultExtended++;
                console.log("counter_listVaultExtended " + counter_listVaultExtended);
            }

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


        /**
         * Gets a list of all resources in the Vault based on the VaultId
         * @param vaultId
         * @param cb
         * @returns resourceList or an error if it is not possible to access the Vault space
         */
        listVaultExtendedById: function (vaultId, cb) {
            if (debugging) {
                counter_listVaultExtendedById++;
                console.log("counter_listVaultExtendedById " + counter_listVaultExtendedById);
            }

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
            if (debugging) {
                counter_filterVault++;
                console.log("counter_filterVault " + counter_filterVault);
            }

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

        /**
         * Logs the action based on objectId, objectType, objectName, spaceId, spaceName, actionType
         * @param objectId
         * @param objectType
         * @param objectName
         * @param spaceId
         * @param spaceName
         * @param actionType
         * @param cb
         */
        logAction: function (objectId, objectType, objectName, spaceId, spaceName, actionType, cb) {
            if (debugging) {
                counter_logAction++;
                console.log("counter_logAction " + counter_logAction);
            }

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

        /**
         * Gets the actions related to a resource in the Vault based on resourceId and vaultId
         * @param vaultId
         * @param resourceId
         * @param cb
         */
        getAction: function (vaultId, resourceId, cb) {
            if (debugging) {
                counter_getAction++;
                console.log("counter_getAction " + counter_getAction);
            }

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
