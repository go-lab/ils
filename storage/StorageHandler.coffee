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

  constructor: (metadataHandler, @_filterForResourceType = true, @_filterForUser = true, @_filterForProvider = false, @_customFilter = null) ->
    console.log "Initializing StorageHandler."
    @_debug = true
    @_lastResourceId = undefined
    try
      metadataHandler.getMetadata()
      @metadataHandler = metadataHandler
    catch error
      throw "StorageHandler needs a MetadataHandler at construction!"

  # the three different filters can be activated or deactivated by setting them to true or false
  # the filter value is fetched from the metadataHandler
  # e.g. the default setting
  # configureFilters(true, true, true)
  # returns only resources that match the resource type, provider id and users id
  configureFilters: (filterForResourceType, filterForUser, filterForProvider) ->
    @_filterForResourceType = filterForResourceType
    @_filterForUser = filterForUser
    @_filterForProvider = filterForProvider

  setCustomFilter: (customFilter)->
    @_customFilter = customFilter

  getCustomFilter: ()->
    @_customFilter

  getMetadataHandler: ->
    @metadataHandler

  # bundles and returns the most important/interesting features of a resource (for load/save dialogs)
  # for convenience only
  getResourceDescription: (resource)->
    {
    id: resource.metadata.id
    title: resource.metadata.target.displayName
    type: resource.metadata.target.objectType
    tool: resource.metadata.generator.displayName
    author: resource.metadata.actor.displayName
    modified: new Date(resource.metadata.published)
    }

  # internal function, typically not used external
  applyFilters: (metadatas) =>
    if @_debug
      console.log "StorageHandler.applyFilters:"
      console.log "filter for type, user, provider:"
      console.log @_filterForResourceType, @_filterForUser, @_filterForProvider
      console.log metadatas
    # it's important to filter provider before user, since the userId contains the providerId, and therefore we then filter for user displayName
    if @_filterForResourceType
      metadatas = metadatas.filter (entry) => entry.metadata.target.objectType is @metadataHandler.getTarget().objectType
    if @_filterForProvider
      metadatas = metadatas.filter (entry) => entry.metadata.provider.id is @metadataHandler.getProvider().id
    if @_filterForUser
      metadatas = metadatas.filter (entry) => entry.metadata.actor.displayName is @metadataHandler.getActor().displayName
    if @_customFilter
      metadatas = metadatas.filter (entry) => @_customFilter(entry.metadata)
    if @_debug
      console.log "after: "
      console.log metadatas
    return metadatas

  # internal function, typically not used external
  getResourceBundle: (content, id = ut.commons.utils.generateUUID()) =>
    # cloning the objects!
    thisContent = JSON.parse(JSON.stringify(content))
    metadata = JSON.parse(JSON.stringify(@metadataHandler.getMetadata()))
    metadata.published = (new Date()).toISOString()
    metadata.id = id
    {
      metadata: metadata,
      content: thisContent
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
          setTimeout(->
            cb null, null
          , 0)


  ###
    Reads a resource with a given id.
    Takes a callback with (err, resource). err is null or contains the error if
    any error occured. It is an error if there is no resource with given id.
  ###
  readResource: (resourceId, cb) ->
    throw "Abstract function readResource - implement in subclass."

  ###
    Checks if there is a resource with given id.
    Takes a callback with (err, exists), where exists is true when there is a
    resource with given id, and false otherwise. err is null or contains the
    error if any error occured.
  ###
  resourceExists: (resourceId, cb) ->
    throw "Abstract function resourceExists - implement in subclass."

  ###
    Creates a resource with the given content.
    Takes a callback with (err, resource), where resource is the newly created
    resource. err is null or contains the error if any error occured.
  ###
  createResource: (content, cb) =>
    throw "Abstract function createResource - implement in subclass."

  ###
    Updates an existing resource with new content.
    Takes a callback with(err, resource), where resource is the updated
    resource. err is null or contains the error if any error occured.
  ###
  updateResource: (resourceId, content, cb) ->
    throw "Abstract function updateResource - implement in subclass."

  ###
    Deletes an existing resource.
    Requires the resourceId of the resource to be deleted,
    and a callback that returns an error if something went wrong,
    or is null on success.
    resource. err is null or contains the error if any error occured.
  ###
  deleteResource: (resourceId, cb) ->
    throw "Abstract function deleteResource - implement in subclass."

  ###
    Calls back with the ids of all existing resources.
    Takes a callback with (err, ids). err is null or contains the error if any
    error occured.
  ###
  listResourceIds: (cb) ->
    throw "Abstract function listResourceIds - implement in subclass."

  ###
    Calls back with the metadata of all existing resources.
    Takes a callback with (err, metadatas), where metadatas is an Array of
    { id, metadata: {} } objects. err is null or contains the error if any error
    occured. The metadatas are (potentially) filtered for username, resource type, and provider id.
  ###
  listResourceMetaDatas: (cb) ->
    throw "Abstract function listResourceMetaDatas - implement in subclass."


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
      if @storeObject[resource.metadata.id]
        error = new Error "MemoryStorage: resource already exists! #{resource.metadata.id}"
        if @_debug then console.log error
        setTimeout(->
          cb(error)
        , 0)
      else
        @storeObject[resource.metadata.id] = resource
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

  listResourceMetaDatas: (cb) =>
    metadatas = []
    for id, resource of @storeObject
      metadatas.push {
        id: id
        metadata: JSON.parse(JSON.stringify(resource.metadata))
      }
    metadatas = @applyFilters(metadatas)
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

  deleteResource: (resourceId, cb) ->
    if @localStorage[goLabLocalStorageKey + resourceId]?
      delete @localStorage[goLabLocalStorageKey + resourceId]
      setTimeout(->
        cb null
      , 0)
    else
      setTimeout(->
        cb "Can't delete resource - doesn't exist."
      , 0)

  createResource: (content, cb) =>
    try
    # create resource with id, metadata and content
      resource = @getResourceBundle(content)
      resourceId = resource.metadata.id
      if @localStorage[goLabLocalStorageKey + resourceId]
        error = new Error "LocalStorageHandler: resource already exists! #{resourceId}"
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

  listResourceMetaDatas: (cb) =>
    metadatas = []
    for id, resourceString of @localStorage when @isGoLabKey(id)
      resource = JSON.parse(resourceString)
      metadatas.push {
        id: resource.metadata.id
        metadata: resource.metadata
      }
    metadatas = @applyFilters(metadatas)
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
    if not ils?
      throw "The ILS library needs to be present for the VaultStorageHandler"
    else
      @configureFilters(true, true, false)
      return @

  readResource: (resourceId, cb) ->
    # this function relays the call to the ILS library,
    # maps is correctly to the callback parameters
    # and does some additional error catching
    try
      ils.readResource resourceId, (result) =>
        if result.error?
          cb result.error
        else
          if @_debug? then console.log "ils.readResource returns:"
          if @_debug? then console.log result
          resource = {}
          resource.metadata = JSON.parse(result.metadata)
          resource.metadata.id = resourceId
          resource.content = JSON.parse(result.content)
          # update the metadata with new properties
          @metadataHandler.setId resource.metadata.id
          @metadataHandler.setTarget(resource.metadata.target)
          cb null, resource
    catch error
      console.warn "Something went wrong when trying to load resource #{resourceId} from the vault:"
      console.warn error
      cb error

  resourceExists: (resourceId, cb) ->
    # this function relays the call to the ILS library,
    # maps is correctly to the callback parameters
    # and does some additional error catching
    try
      ils.existResource resourceId, (result) =>
        if result.error?
          cb result.error
        else
          cb null, result
    catch error
      console.warn "Something went wrong when trying to call 'resourceExists' from the vault:"
      console.warn error
      cb error

  createResource: (content, cb) =>
    # this function relays the call to the ILS library,
    # maps is correctly to the callback parameters
    # and does some additional error catching
    try
      resource = @getResourceBundle(content)
      resourceName = resource.metadata.target.displayName
      # the resource.metadata.id will be generated by the Vault,
      # we can only set it later (see below)
      resource.metadata.id = undefined
      ils.createResource resourceName, resource.content, resource.metadata, (result) =>
        if @_debug? then console.log "ils.createResource returns:"
        if @_debug? then console.log result
        if result.error?
          cb result.error
        else
          returnedResource = {}
          returnedResource.content = resource.content
          returnedResource.metadata = JSON.parse(result.metadata)
          returnedResource.metadata.id = result.id
          # the id might have change here. update in metadata handler
          @metadataHandler.setId resource.metadata.id
          cb null, returnedResource
    catch error
      console.warn "Something went wrong when trying to create a resource in the vault:"
      console.warn error
      cb error

  updateResource: (resourceId, content, cb) ->
    # this function relays the call to the ILS library,
    # maps is correctly to the callback parameters
    # and does some additional error catching
    try
      resource = @getResourceBundle(content)
      content = resource.content
      metadata = resource.metadata
      metadata.id = resourceId
      ils.updateResource resourceId, content, metadata, (result) =>
        if @_debug? then console.log "ils.updateResource returns:"
        if @_debug? then console.log result
        if result.error?
          cb result.error
        else
          updatedResource = {}
          updatedResource.content = content
          updatedResource.metadata = JSON.parse(result.metadata)
          updatedResource.metadata.id = result.id
          # the id might have change here. update in metadata handler
          @metadataHandler.setId resource.metadata.id
          cb null, updatedResource
    catch error
      console.warn "Something went wrong when trying to update resource #{resourceId} in the vault:"
      console.warn error
      cb error

  listResourceIds: (cb) ->
    throw "Not yet implemented."

  listResourceMetaDatas: (cb) ->
    # this function relays the call to the ILS library,
    # maps is correctly to the callback parameters
    # and does some additional error catching
    try
      ils.listVaultExtended (result) =>
        if @_debug? then console.log "ils.listVaultExtended returns:"
        if @_debug? then console.log result
        if result.error?
          if result.error is "No resource available in the Vault."
            cb null, []
          else
            cb result.error
        else
          returnedMetadatas = []
          for resource in result
            item = {}
            item.id = resource.id
            item.metadata = JSON.parse(resource.metadata)
            # to prevent potential inconsistencies:
            item.metadata.id = resource.id
            returnedMetadatas.push item
          returnedMetadatas = @applyFilters(returnedMetadatas)
          cb null, returnedMetadatas
    catch error
      console.warn "Something went wrong when trying to list the resources in the vault:"
      console.warn error
      cb error

###
  Implementation of a MongoDB storage handler.
###
class window.golab.ils.storage.MongoStorageHandler extends window.golab.ils.storage.StorageHandler
  constructor: (metadataHandler, @urlPrefix) ->
    super metadataHandler, true, true, true
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
        contentType: "text/plain"
        crossDomain: true,
        success: (resource) ->
          console.log("GET readResource success, response:")
          console.log resource
          cb null, resource
        error: (responseData, textStatus, errorThrown) ->
          console.warn "GET readResource failed, response:"
          console.warn errorThrown
          cb errorThrown
      })
    catch error
      console.warn "Something went wrong when retrieving the resource:"
      console.warn error
      cb error

  deleteResource: (resourceId, cb) ->
    try
      $.ajax({
        type: "POST",
        url: "#{@urlPrefix}/deleteResource/"+resourceId,
        crossDomain: true,
        success: (response) ->
          console.log("POST deleteResource success, response:")
          console.log response
          cb null
        error: (responseData, textStatus, errorThrown) ->
          console.warn "POST deleteResource failed, response:"
          console.warn errorThrown
          cb errorThrown
      })
    catch error
      console.warn "Something went wrong when deleting the resource:"
      console.warn error
      cb error

  resourceExists: (resourceId, cb) ->
    try
      $.ajax({
        type: "GET",
        url: "#{@urlPrefix}/resourceExists/"+resourceId,
        crossDomain: true,
        contentType: "text/plain"
        success: (result) ->
          console.log("GET resourceExists success, response:")
          console.log result
          cb undefined, true
        error: (responseData, textStatus, errorThrown) ->
          console.warn "GET resourceExists failed, response:"
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
      # do not use Mongo's ObjectId mechanism, but use your own id
      # ... makes a couple of things easier
      resource._id = resource.metadata.id
      $.ajax({
        type: "POST",
        url: "#{@urlPrefix}/storeResource",
        data: JSON.stringify(resource),
        contentType: "text/plain"
        crossDomain: true,
        success: (responseData, textStatus, jqXHR) ->
          console.log("POST createResource success, response:")
          console.log responseData
          # remove that mongo-internal id again
          delete resource._id
          cb undefined, resource
        error: (responseData, textStatus, errorThrown) ->
          console.warn "POST createResource failed, response:"
          console.warn responseData
          cb responseData
      })
    catch error
      console.log "Something went wrong when writing to Mongo:"
      console.error error
      cb error

  updateResource: (resourceId, content, cb) ->
    try
      @resourceExists resourceId, (error, result) =>
        if error?
          cb error
        else
          # creating a resource with a give id
          resource = @getResourceBundle(content, resourceId)
          # adding the mongo specific id
          resource._id = resource.metadata.id
          $.ajax({
            type: "POST",
            url: "#{@urlPrefix}/updateResource",
            data: JSON.stringify(resource),
            contentType: "text/plain"
            crossDomain: true,
            success: (responseData, textStatus, jqXHR) ->
              console.log("POST updateResource success, response:")
              console.log responseData
              delete resource._id
              cb null, resource
            error: (responseData, textStatus, errorThrown) ->
              console.warn "POST updateResource failed, response:"
              console.warn responseData
              cb responseData
          })
    catch error
      console.log "Something went wrong when updating to Mongo:"
      console.error error
      cb error

  listResourceMetaDatas: (cb) =>
    try
      $.support.cors = true;
      $.ajax({
        type: "GET",
        crossDomain: true
        contentType: "text/plain"
        # TODO active filters can already be applied here in the URL
        url: "#{@urlPrefix}/listResourceMetaDatas",
        #url: "#{@urlPrefix}/listResourceMetaDatas/#{encodeURIComponent(@metadataHandler.getProvider().id)}/#{encodeURIComponent(@metadataHandler.getActor().id)}",
        success: (responseData) =>
          console.log("GET listResourceMetaDatas success, response (before filters):")
          console.log responseData
          responseData = @applyFilters(responseData)
          cb undefined, responseData
        error: (responseData, textStatus, errorThrown) ->
          console.warn "GET listResourceMetaDatas failed, response:"
          console.warn JSON.stringify(responseData)
          cb responseData
      })
    catch error
      console.warn "Something went wrong when retrieving the metedatas:"
      console.warn error
      cb error

  listResourceIds: (cb) ->
    throw "Not yet implemented."


###
  Implementation of a MongoDB-IIS storage handler.
###
class window.golab.ils.storage.MongoIISStorageHandler extends window.golab.ils.storage.StorageHandler
  constructor: (metadataHandler, @urlPrefix) ->
    super metadataHandler, true, true, true
    if @urlPrefix?
      console.log "Initializing MongoStorageHandler."
      @
    else
      console.error "I need an urlPrefix as second parameter."

  createResource: (content, cb) =>
    try
    # create resource with id, metadata and content
      resource = @getResourceBundle(content)
      # do not use Mongo's ObjectId mechanism, but use your own id
      # ... makes a couple of things easier
      resource._id = resource.metadata.id
      $.ajax({
        type: "POST"
        url: "#{@urlPrefix}/storeResource.js"
        contentType: "text/plain"
        data: JSON.stringify(resource)
        crossDomain: true
        success: (responseData, textStatus, jqXHR) ->
          console.log("POST createResource success, response:")
          console.log responseData
          # remove that mongo-internal id again
          delete resource._id
          cb undefined, resource
        error: (responseData, textStatus, errorThrown) ->
          console.warn "POST createResource failed, response:"
          console.warn responseData
          cb responseData
      })
    catch error
      console.log "Something went wrong when writing to Mongo:"
      console.error error
      cb error

  updateResource: (resourceId, content, cb) ->
    try
      @resourceExists resourceId, (error, result) =>
        if error?
          cb error
        else
          # creating a resource with a give id
          resource = @getResourceBundle(content, resourceId)
          # adding the mongo specific id
          resource._id = resource.metadata.id
          $.ajax({
            type: "POST",
            url: "#{@urlPrefix}/updateResource.js",
            data: JSON.stringify(resource),
            #contentType: "application/json",
            crossDomain: true,
            success: (responseData, textStatus, jqXHR) ->
              console.log("POST updateResource success, response:")
              console.log responseData
              console.log textStatus
              console.log jqXHR
              delete resource._id
              cb null, resource
            error: (responseData, textStatus, errorThrown) ->
              console.warn "POST updateResource failed, response:"
              console.warn responseData
              cb responseData
          })
    catch error
      console.log "Something went wrong when updating to Mongo:"
      console.error error
      cb error

  listResourceMetaDatas: (cb) =>
    try
      urlString = "/listMetadatas.js"
      filterString = ""
      if @_filterForProvider then filterString = "providerId=#{@metadataHandler.getProvider().id}"
      if @_filterForUser
        if filterString?
          filterString = filterString+"&"
        filterString = filterString + "actorId=#{@metadataHandler.getActor().id}"
      if filterString?
        urlString = urlString + "?" + filterString
      $.ajax({
        type: "GET",
        crossDomain: true
        contentType: "text/plain"
        url: @urlPrefix+urlString
        success: (responseData) =>
          console.log("GET listResourceMetaDatas success, response (before filters):")
          console.log responseData
          metadatas = @applyFilters(responseData)
          cb undefined, metadatas
        error: (responseData, textStatus, errorThrown) ->
          console.warn "GET listResourceMetaDatas failed, response:"
          console.warn JSON.stringify(responseData)
          cb responseData
      })
    catch error
      console.warn "Something went wrong when retrieving the metedatas:"
      console.warn error
      cb error

  readResource: (resourceId, cb) ->
    try
      $.ajax({
        type: "GET",
        url: "#{@urlPrefix}/readResource.js?id="+resourceId,
        crossDomain: true,
        success: (resource) ->
          console.log("GET readResource success, response:")
          console.log resource
          cb null, resource
        error: (responseData, textStatus, errorThrown) ->
          console.warn "GET readResource failed, response:"
          console.warn errorThrown
          cb errorThrown
      })
    catch error
      console.warn "Something went wrong when retrieving the resource:"
      console.warn error
      cb error

  deleteResource: (resourceId, cb) ->
    try
      $.ajax({
        type: "POST",
        url: "#{@urlPrefix}/deleteResource.js?id="+resourceId,
        crossDomain: true,
        success: (response) ->
          console.log("POST deleteResource success, response:")
          console.log response
          cb null
        error: (responseData, textStatus, errorThrown) ->
          console.warn "POST deleteResource failed, response:"
          console.warn errorThrown
          cb errorThrown
      })
    catch error
      console.warn "Something went wrong when deleting the resource:"
      console.warn error
      cb error

  resourceExists: (resourceId, cb) ->
    try
      $.ajax({
        type: "GET",
        url: "#{@urlPrefix}/resourceExists.js?id="+resourceId,
        crossDomain: true,
        success: (result) ->
          console.log("GET resourceExists success, response:")
          console.log result
          cb undefined, true
        error: (responseData, textStatus, errorThrown) ->
          console.warn "GET resourceExists failed, response:"
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
