### example metadata
  {
    "actor":
    {
      "objectType": "person",
      "id": "f25d7eff-8859-49ed-85e9-e7c1f92bc334",
      "displayName": "anonymized"
    },
    "target":
    {
      "objectType": "conceptMap",
      "id": "9383fbbe-e071-49b2-9770-46ddc4f8cd6e",
      "displayName": "unnamed concept map"
    },
    "generator":
    {
      "objectType": "application",
      "url": document.URL,
      "id": "04123e9e-14d0-447b-a851-805b9262d9a6",
      "displayName": "ut.tools.conceptmapper"
    },
    "provider":
    {
      "objectType": "ils",
      "url": "http://graasp.epfl.ch/metawidget/1/b387b6f...",
      "id": "0f8184db-53ba-4868-9208-896c3d7c25bb",
      "displayName": "name-of-ils"
    }
  }
###

"use strict"

window.golab = window.golab || {}
window.golab.ils = window.golab.ils || {}
window.golab.ils.metadata = window.golab.ils.metadata || {}

class window.golab.ils.metadata.MetadataHandler

  constructor: (metadata, cb) ->
    console.log("Initializing MetadataHandler.")
    if metadata
      # cloning the parameter to avoid side-effects
      @_metadata = JSON.parse(JSON.stringify(metadata))
    else
      throw "MetadataHandler needs a initial metadata at construction!"
    if window["sessionId"]
      @_metadata.provider.id = window["sessionId"]
    setTimeout(->
      cb(null, @) if cb
    , 0)
    @

  setMetadata: (newMetadata) ->
    # cloning the parameter to avoid side-effects
    @_metadata = JSON.parse(JSON.stringify(newMetadata))
    @

  mergeMetadata: (newMetadata) ->
    # todo
    throw("not implemented yet.")
    @

  getMetadata: () ->
    @_metadata

  getActor: () ->
    @_metadata.actor

  getTarget: () ->
    @_metadata.target

  getGenerator: () ->
    @_metadata.generator

  getProvider: () ->
    @_metadata.provider

  getTargetDisplayName: () ->
    @_metadata.target.displayName

  setTargetDisplayName: (newName) ->
    @_metadata.target.displayName = newName


class window.golab.ils.metadata.GoLabMetadataHandler extends window.golab.ils.metadata.MetadataHandler

  constructor: (metadata, cb) ->
    metadata.provider ?= { objectType: 'ils' }
    metadata.actor ?= { objectType: 'person'}
    if osapi?
      osapi.context.get().execute (result) =>
        metadata.provider.id = result.contextId
        # TODO: This could be changed to ils.getCurrentUser() in the future.
        osapi.people.getViewer().execute (viewer) =>
          metadata.actor.id = viewer.id;
          metadata.displayName = viewer.displayName;
          super metadata
          cb(null, @)
    else
      console.warn "Could not get infos from osapi, using given metadata."
      super metadata
      cb(null, @)
