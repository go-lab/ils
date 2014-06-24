"use strict"

window.golab = window.golab || {}
window.golab.ils = window.golab.ils || {}
window.golab.ils.storage = window.golab.ils.storage || {}
window.golab.ils.storage.memory = window.golab.ils.storage.memory || {}

###
  Superclass for all storage handlers.
  A resource has the structure { id, content: {}, metadata: {} }.
###
class window.golab.ils.storage.StorageHandler

  constructor: (metadataHandler) ->
    console.log "Initializing StorageHandler."
    @_debug = true
    try
      metadataHandler.getMetadata()
      @metadataHandler = metadataHandler
    catch error
      throw "StorageHandler needs a MetadataHandler at construction!"

  getMetadataHandler: ->
    @metadataHandler

  getResourceDescription: (resource)->
    {
    id: resource.id
    title: resource.metadata.target.displayName
    tool: resource.metadata.generator.displayName
    modified: new Date(resource.metadata.published)
    }

  getResourceBundle: (content, id = ut.commons.utils.generateUUID()) =>
    # cloning the objects!
    content = JSON.parse(JSON.stringify(content))
    metadata = JSON.parse(JSON.stringify(@metadataHandler.getMetadata()))
    # TODO move resource.metadata.published to resource.published
    metadata.published = (new Date()).toISOString()
    {
      id: id,
      metadata: metadata,
      content: content
    }

  readLatestResource: (objectType, cb) =>
    if @_debug then console.log "StorageHandler: searching for latest resource of type '#{objectType}'"
    # iterate through list of all available metadata
    @listResourceMetaDatas (error, metadatas) =>
      if error?
        setTimeout(->
          cb(error, undefined)
        , 0)
      else
        latestDate = new Date(1970,0,1)
        latestId = undefined
        for entry in metadatas
          if objectType? and objectType isnt entry.metadata.target.objectType
            # skip entry if an objectType is give, but it doesn't match
            continue
          if entry.metadata.published?
            # search for the latest date
            date = new Date(entry.metadata.published)
            if date > latestDate
              latestDate = date
              latestId = entry.id
        if latestId?
          @readResource latestId, cb
        else
          error = new Error "StorageHandler: no matching latest resource found."
          setTimeout(->
            cb error, undefined
          , 0)


  ###
    Reads a resource with a given id.
    Takes a callback with (err, resource). err is null or contains the error if
    any error occured. It is an error if there is no resource with given id.
  ###
  readResource: (resourceId, cb) ->
    throw "Abstract function - implement in subclass."

  ###
    Checks if there is a resource with given id.
    Takes a callback with (err, exists), where exists is true when there is a
    resource with given id, and false otherwise. err is null or contains the
    error if any error occured.
  ###
  resourceExists: (resourceId, cb) ->
    throw "Abstract function - implement in subclass."

  ###
    Creates a resource with the given content.
    Takes a callback with (err, resource), where resource is the newly created
    resource. err is null or contains the error if any error occured.
  ###
  createResource: (content, cb) =>
    throw "Abstract function - implement in subclass."

  ###
    Updates an existing resource with new content.
    Takes a callback with(err, resource), where resource is the updated
    resource. err is null or contains the error if any error occured.
  ###
  updateResource: (resourceId, content, cb) ->
    throw "Abstract function - implement in subclass."

  ###
    Calls back with the ids of all existing resources.
    Takes a callback with (err, ids). err is null or contains the error if any
    error occured.
  ###
  listResourceIds: (cb) ->
    throw "Abstract function - implement in subclass."

  ###
    Calls back with the metadata of all existing resources.
    Takes a callback with (err, metadatas), where metadatas is an Array of
    { id, metadata: {} } objects. err is null or contains the error if any error
    occured.
  ###
  listResourceMetaDatas: (cb) ->
    throw "Abstract function - implement in subclass."


###
  Implementation of an object storage handler
###
class window.golab.ils.storage.ObjectStorageHandler extends window.golab.ils.storage.StorageHandler
  constructor: (metadataHandler, storeObject) ->
    super
    if ( typeof storeObject != "object")
      throw "you must pass on an object to store the resources"
    @storeObject = storeObject
    console.log "Initializing ObjectStorageHandler."
    @

  readResource: (resourceId, cb) ->
    if @storeObject[resourceId]
      if @_debug then console.log "MemoryStorage: readResource #{resourceId}"
      # cloning!
      setTimeout(->
        cb(null, JSON.parse(JSON.stringify(@storeObject[resourceId])))
      , 0)
    else
      error = new Error "MemoryStorage: readResource #{resourceId} not found."
      if @_debug then console.log error
      setTimeout(->
        cb(error)
      , 0)

  resourceExists: (resourceId, cb) ->
    exists = @storeObject[resourceId] != undefined
    cb(null, exists)

  createResource: (content, cb) =>
    try
      # create resource with id, metadata and content
      resource = @getResourceBundle(content)
      if @storeObject[resource.id]
        error = new Error "MemoryStorage: resource already exists! #{resource.id}"
        if @_debug then console.log error
        setTimeout(->
          cb(error)
        , 0)
      else
        @storeObject[resource.id] = resource
        if @_debug then console.log "MemoryStorage: resource created: #{resource}"
        if @_debug then console.log resource
        setTimeout(->
          cb(null, resource)
        , 0)
    catch error
      error = new Error "MemoryStorage: resource NOT created: #{error}"
      if @_debug then console.log error
      setTimeout(->
        cb(error)
      , 0)

  updateResource: (resourceId, content, cb) ->
    if @storeObject[resourceId]
      # create resource with id, metadata and content
      resource = @getResourceBundle(content, resourceId)
      @storeObject[resourceId] = resource
      console.log "MemoryStorage: updateResource #{resourceId}"
      setTimeout(->
        cb(null, resource)
      , 0)
    else
      error = new Error "MemoryStorage: updateResource failed, resource doesn't exist: #{resourceId}"
      console.log error
      setTimeout(->
        cb(error)
      , 0)

  listResourceIds: (cb) ->
    ids = (id for id, resource of @storeObject)
    setTimeout(->
      cb(null, ids)
    , 0)

  listResourceMetaDatas: (cb) ->
    metadatas = []
    for id, resource of @storeObject
      metadatas.push {
        id: id
        metadata: JSON.parse(JSON.stringify(resource.metadata))
      }
    setTimeout(->
      cb(null, metadatas)
    , 0)

###
  Implementation of a memory storage handler, which is a subclass of the object storage handler.
###
class window.golab.ils.storage.MemoryStorageHandler extends window.golab.ils.storage.ObjectStorageHandler
  constructor: (metadataHandler)->
    super(metadataHandler, {})
    console.log "Initializing MemoryStorageHandler, debug: #{@_debug}."
    @

###
  Implementation of a local (browser) storage handler.
###
if false
  # let intellij know that localStorage does exits
  localStorage = localStorage || {}

goLabLocalStorageKey = "_goLab_"
class window.golab.ils.storage.LocalStorageHandler extends window.golab.ils.storage.StorageHandler
  constructor: (metadataHandler) ->
    super
    console.log "Initializing LocalStorageHandler."
    @localStorage = window.localStorage
    @

  readResource: (resourceId, cb) ->
    if @localStorage[goLabLocalStorageKey + resourceId]
      if @_debug then console.log "LocalStorageHandler: readResource #{resourceId}"
      setTimeout(->
        cb(null, JSON.parse(@localStorage[goLabLocalStorageKey + resourceId]))
      , 0)
    else
      error = new Error "LocalStorageHandler: readResource #{resourceId} not found."
      if @_debug then console.log error
      setTimeout(->
        cb(error)
      , 0)

  resourceExists: (resourceId, cb) ->
    exists = @localStorage[goLabLocalStorageKey + resourceId] != undefined
    setTimeout(->
      cb(null, exists)
    , 0)

  createResource: (content, cb) =>
    try
    # create resource with id, metadata and content
      resource = @getResourceBundle(content)
      resourceId = resource.id
      if @localStorage[goLabLocalStorageKey + resourceId]
        error = new Error "LocalStorageHandler: resource already exists! #{resource.id}"
        if @_debug then console.log error
        setTimeout(->
          cb(error)
        , 0)
      else
        @localStorage[goLabLocalStorageKey + resourceId] = JSON.stringify(resource)
        if @_debug then console.log "LocalStorageHandler: resource created: #{resource}"
        if @_debug then console.log resource
        setTimeout(->
          cb(null, resource)
        , 0)
    catch error
      error = new Error "LocalStorageHandler: resource NOT created: #{error}"
      if @_debug then console.log error
      setTimeout(->
        cb(error)
      , 0)

  updateResource: (resourceId, content, cb) ->
    if @localStorage[goLabLocalStorageKey + resourceId]
      # create resource with id, metadata and content
      resource = @getResourceBundle(content, resourceId)
      @localStorage[goLabLocalStorageKey + resourceId] = JSON.stringify(resource)
      console.log "LocalStorageHandler: updateResource #{resourceId}"
      setTimeout(->
        cb(null, resource)
      , 0)
    else
      error = new Error "LocalStorageHandler: updateResource failed, resource doesn't exist: #{resourceId}"
      console.log error
      setTimeout(->
        cb(error)
      , 0)

  isGoLabKey: (key) ->
    key.indexOf(goLabLocalStorageKey) == 0

  listResourceIds: (cb) ->
    stripPrefix = (id) -> id.substr(goLabLocalStorageKey.length)
    ids = (stripPrefix(id) for id, resourceString of @localStorage when @isGoLabKey(id))
    setTimeout(->
      cb(null, ids)
    , 0)

  listResourceMetaDatas: (cb) ->
    metadatas = []
    for id, resourceString of @localStorage when @isGoLabKey(id)
      resource = JSON.parse(resourceString)
      metadatas.push {
        id: resource.id
        metadata: resource.metadata
      }
    setTimeout(->
      cb(null, metadatas)
    , 0)

###
  Implementation of a Vault (Graasp/ILS) storage handler.
###
class window.golab.ils.storage.VaultStorageHandler extends window.golab.ils.storage.StorageHandler
  constructor: (metadataHandler) ->
    super
    console.log "Initializing VaultStorageHandler."
    if not ils
      throw "The ILS library needs to be present for the VaultStorageHandler"
    else
      return @

  readResource: (resourceId, cb) ->
    # this function only relays the call to the ILS library and does some error catching
    try
      ils.readResource resourceId, (error, result) =>
        if result.error
          cb error
        else
          cb null, result
    catch error
      console.warn "something went wrong when trying to load from the vault:"
      console.warn error
      cb error

  resourceExists: (resourceId, cb) ->
    throw "Not yet implemented."

  createResource: (content, cb) =>
    try
      # create resource with id, metadata and content
      resource = @getResourceBundle(content)
      # remove the resource.id (if present...), because the Vault will set its own id
      # (see result.id below)
      resource.id = ""
      ils.createResource resource, (error, result) =>
        if error
          cb error
        else
          resource.id = result.id
          cb null, resource
    catch error
      console.log "Vault resource creation unsuccessful: "
      console.error error
      cb error

  updateResource: (resourceId, content, cb) ->
    throw "Not yet implemented."

  listResourceIds: (cb) ->
    throw "Not yet implemented."

  listResourceMetaDatas: (callback) ->
    ils.listVault (error, result) =>
      if error
        callback error
      else
        console.log "listResourceMetaDatas:"
        console.log result
        callback null, result

###
  Implementation of a MongoDB storage handler.
###
class window.golab.ils.storage.MongoStorageHandler extends window.golab.ils.storage.StorageHandler
  constructor: (metadataHandler, @urlPrefix) ->
    super
    if @urlPrefix?
      console.log "Initializing MongoStorageHandler."
      @
    else
      console.error "I need an urlPrefix as second parameter."

  readResource: (resourceId, cb) ->
    try
      $.ajax({
        type: "GET",
        url: "#{@urlPrefix}/readResource/"+resourceId,
        success: (resource) ->
          console.log("GET success, response:")
          console.log resource
          cb null, resource
        error: (responseData, textStatus, errorThrown) ->
          console.warn "GET failed, response:"
          console.warn errorThrown
          cb errorThrown
      })
    catch error
      console.warn "Something went wrong when retrieving the resource:"
      console.warn error
      cb error

  resourceExists: (resourceId, cb) ->
    try
      $.ajax({
        type: "GET",
        url: "#{@urlPrefix}/resourceExists/"+resourceId,
        success: (result) ->
          console.log("GET success, response:")
          console.log result
          cb undefined, true
        error: (responseData, textStatus, errorThrown) ->
          console.warn "GET failed, response:"
          console.warn responseData
          if responseData.status is 500
            cb errorThrown
          else if responseData.status is 410
            cb undefined, false
      })
    catch error
      console.warn "Something went wrong when retrieving the resource:"
      console.warn error
      cb error

  createResource: (content, cb) =>
    try
    # create resource with id, metadata and content
      resource = @getResourceBundle(content)
      $.ajax({
        type: "POST",
        url: "#{@urlPrefix}/storeResource",
        data: JSON.stringify(resource),
        contentType: "application/json",
        success: (responseData, textStatus, jqXHR) ->
          console.log("POST success, response:")
          console.log responseData
          cb undefined, resource
        error: (responseData, textStatus, errorThrown) ->
          console.warn "POST failed, response:"
          console.warn responseData
          cb responseData
      })
    catch error
      console.log "Something went wrong when writing to Mongo:"
      console.error error
      cb error

  updateResource: (resourceId, content, cb) ->
    throw "Not yet implemented."

  listResourceMetaDatas: (cb) ->
    try
      $.ajax({
        type: "GET",
        url: "#{@urlPrefix}/listResourceMetaDatas/#{encodeURIComponent(@metadataHandler.getProvider().id)}/#{encodeURIComponent(@metadataHandler.getActor().id)}",
        success: (responseData) ->
          console.log("GET success, response:")
          console.log responseData
          cb undefined, responseData
        error: (responseData, textStatus, errorThrown) ->
          console.warn "GET failed, response:"
          console.warn responseData
          #console.warn textStatus
          #console.warn errorThrown
          cb responseData
      })
    catch error
      console.warn "Something went wrong when retrieving the metedatas:"
      console.warn error
      cb error

  listResourceIds: (cb) ->
    throw "Not yet implemented."