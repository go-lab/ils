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
      "inquiryPhase": "orientation"
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
      throw "MetadataHandler needs an initial set of metadata at construction!"
    setTimeout(=>
      cb(null, @) if cb
    , 0)
    console.log "using metadata:"
    console.log @_metadata
    @

  setMetadata: (newMetadata) ->
    # cloning the parameter to avoid side-effects
    @_metadata = JSON.parse(JSON.stringify(newMetadata))
    @

  getMetadata: () ->
    @_metadata

  setActor:(newActor) ->
    @_metadata.actor = newActor

  getActor: () ->
    @_metadata.actor

  getTarget: () ->
    @_metadata.target

  setTarget: (newTarget) ->
    @_metadata.target = JSON.parse(JSON.stringify(newTarget))

  getGenerator: () ->
    @_metadata.generator

  getProvider: () ->
    @_metadata.provider

  getTargetDisplayName: () ->
    @_metadata.target.displayName

  setTargetDisplayName: (newName) ->
    @_metadata.target.displayName = newName

  setTargetId: (newId) ->
    @_metadata.target.id = newId


class window.golab.ils.metadata.GoLabMetadataHandler extends window.golab.ils.metadata.MetadataHandler

  constructor: (metadata, cb) ->
    if osapi?
      # we in an OpenSocial context, try to get information from there...
      console.log "Retrieving metadata from osapi/ils."
      try
        if not $.cookie
          throw "jquery.cookie library needs to be present before using the (GoLab)MetadataHandler (needed by ILS library)."
        if not ils
          throw "ILS library needs to be present before using the (GoLab)MetadataHandler."
        ils.getCurrentUser (userResult) =>
          if userResult.error
            console.warn "error reading username:"
            console.warn userResult.error
            metadata.actor.displayName = "unknown"
          else
            metadata.actor.displayName = userResult
          ils.getIls (ilsSpace, phaseSpace) =>
            console.log "GoLab-MetadataHandler: ilsSpace, phaseSpace:"
            console.log ilsSpace
            console.log phaseSpace
            metadata.generator.url = gadgets.util.getUrlParameters().url
            if ilsSpace?
              metadata.provider.objectType = ilsSpace.spaceType
              metadata.provider.id = ilsSpace.objectId
              metadata.provider.displayName = ilsSpace.displayName
            metadata.provider.url = ilsSpace.profileUrl
            # TODO: use ils.getParentInquiryPhase() in future
            if phaseSpace?
              metadata.provider.inquiryPhase = phaseSpace.displayName
            actorId = metadata.actor.displayName+"@"+metadata.provider.id
            metadata.actor.id = actorId
            super metadata
            cb(null, @)
      catch error
       console.warn "error during metadata retrieval:"
       console.warn error
    else
      console.log "Running outside osapi/ils, using given metadata."
      super metadata
      cb(null, @)