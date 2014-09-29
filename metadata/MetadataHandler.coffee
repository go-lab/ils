### example metadata
  {
    "id": "f25d7eff-8859-49ed-85e9-e7c1f92bc111",
    "published": "2014-06-05T13:15:30Z",
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


class window.golab.ils.metadata.LocalMetadataHandler extends window.golab.ils.metadata.MetadataHandler

  constructor: (metadata, cb) ->
    getIdentifyingUrl = ->
      path = window.location.pathname
      subPaths = window.location.pathname.split("/")
      if (subPaths.length>0)
        switch subPaths[0].toLocaleLowerCase()
          when "production"
            path = subPaths[0]
          when "experiments"
            path = subPaths[0]
            if subPaths.length>1
              path += "/"+subPaths[0]
          else
            path = ""
      "#{window.location.protocol}//#{window.location.host}#{path}".toLowerCase()

    # overriding some default values with the correct values for the "local" context
    metadata.provider.id = getIdentifyingUrl()
    # if present as URL, take from there
    if (@getParameterFromUrl("provider")?)
      metadata.provider.id = @getParameterFromUrl("provider")
    # if we have a name of the ILS, we can set it here
    metadata.provider.displayName = "unnamed"

    # if that goes wrong, call the callback with an error
    userNickname = localStorage.getItem('goLabNickName')
    if (!userNickname)
      # if no nickname is stored, try to get one from the URL
      if (@getParameterFromUrl("username")?)
        userNickname = @getParameterFromUrl("username")
      else
        # if all fails, set to "unknown"
        userNickname = "unknown user"
    metadata.actor.displayName = userNickname
    actorId = metadata.actor.displayName+"@"+metadata.provider.id
    metadata.actor.id = actorId

    # set the metadata in the super-constructor
    # and return it via callback
    super metadata
    cb(null, @)

  getParameterFromUrl: (key) ->
    key = key.toLowerCase()
    parameter = null
    queryPart = location.search.trim().toLowerCase()
    if (queryPart && queryPart[0] == "?")
      parts = queryPart.substring(1).split("&")
      for part in parts
        partParts = part.split("=")
        if (partParts.length == 2 && partParts[0] == key)
          parameter = partParts[1]
    parameter