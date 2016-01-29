"use strict"

window.golab = window.golab || {}
window.golab.ils = window.golab.ils || {}
window.golab.ils.storage = window.golab.ils.storage || {}
window.golab.ils.storage.memory = window.golab.ils.storage.memory || {}

dummy = {
  metadata: {}
  support: {}
}

###
  Superclass for all storage handlers.
  A resource has the structure { id, content: {}, metadata: {} }.
###
class window.golab.ils.storage.StorageHandler

  constructor: (metadataHandler, @_filterForResourceType = true, @_filterForUser = true, @_filterForProvider = true, @_customFilter = null, @_filterForAppId = true) ->
    @className = "golab.ils.storage.StorageHandler"
    @_debug = true
    #    @_debug = true
    if @_debug then console.log "Initializing StorageHandler."
    @_lastResourceId = undefined
    try
      metadataHandler.getMetadata()
      @metadataHandler = metadataHandler
    catch error
      throw "StorageHandler needs a MetadataHandler at construction!"
    @_isReadOnly = false
    @checkWritePermission()
    if @_debug
      console.log "...StorageHandler is readOnly? -> "+@isReadOnly()

  checkWritePermission: ->
    # TODO override for the time being
    @_isReadOnly = false
    return

    if @metadataHandler.getMetadata().contextualActor?
      # we are in review mode / contextual actor
      @_isReadOnly = true
    else if @metadataHandler.getActor().objectType is "graasp_viewer"
      # the user doesn't have permission to access the vault (typically when somebody has not been made "owner" in a space)
      @_isReadOnly = true
    else
      @_isReadOnly = false

  ###
    Returns a boolean value to indicate if the StorageHandler is running in readOnly mode.
    In readOnly mode, calls to createResource, updateResource and deleteResource
    are doing nothing and return an error instead.
  ###
  isReadOnly: () ->
    return @_isReadOnly

  ###
    (newValue: boolean)
    Sets the internal _isReadOnly variable to a new value to override the initial setting at construction time.
    Be careful with this function, as it may cause problems when you don't have write permissions to an "external" storage.
  ###
  setReadOnly: (newValue) ->
    @_isReadOnly = newValue

  getDebugLabel: ->
    "#{@className}(#{@metadataHandler.getTarget().objectType})"

  generateUUID: () ->
    @metadataHandler.generateUUID()

  # the three different filters can be activated or deactivated by setting them to true or false
  # the filter value is fetched from the metadataHandler
  # e.g. the default setting
  # configureFilters(true, true, true)
  # returns only resources that match the resource type, provider id and users id
  configureFilters: (filterForResourceType, filterForUser, filterForProvider, filterForAppId = true) ->
    @_filterForResourceType = filterForResourceType
    @_filterForUser = filterForUser
    @_filterForProvider = filterForProvider
    @_filterForAppId = filterForAppId

  setForResourceTypeFilter: (filterForResourceType)->
    @_filterForResourceType = filterForResourceType

  getForResourceTypeFilter: ()->
    @_filterForResourceType

  setForUserFilter: (filterForUser)->
    @_filterForUser = filterForUser

  getForUserFilter: ()->
    @_filterForUser

  setForProviderFilter: (filterForProvider)->
    @_filterForProvider = filterForProvider

  getForProviderFilter: ()->
    @_filterForProvider

  setForAppIdFilter: (filterForAppId)->
    @_filterForAppId = filterForAppId

  getForAppIdFilter: ()->
    @_filterForAppId

  setCustomFilter: (customFilter)->
    @_customFilter = customFilter

  getCustomFilter: ()->
    @_customFilter

  getMetadataHandler: ->
    @metadataHandler

  # bundles and returns the most important/interesting features of a resource (for load/save dialogs)
  # for convenience only
  getResourceDescription: (resource)->
    errorAnswer = (noLabel) ->
      errorMessage = "unknown, no #{noLabel}"
      {
      id: errorMessage
      title: errorMessage
      type: errorMessage
      tool: errorMessage
      author: errorMessage
      modified: errorMessage
      }
    if (!resource)
      errorAnswer("resource")
    else if (!resource.metadata)
      errorAnswer("metadata")
    else
      metadata = resource.metadata
      id = if (metadata.id) then metadata.id else ""
      title = if (metadata.target && metadata.target.displayName) then metadata.target.displayName else ""
      type = if (metadata.target && metadata.target.objectType) then metadata.target.objectType else ""
      tool = if (metadata.generator && metadata.generator.displayName) then metadata.generator.displayName else ""
      author = if (metadata.actor && metadata.actor.displayName) then metadata.actor.displayName else ""
      modified = if (metadata.published) then new Date(resource.metadata.published) else new Date()
      {
      id: id
      title: title
      type: type
      tool: tool
      author: author
      modified: modified
      }

  # internal function, typically not used external
  applyFilters: (metadatas) =>
    if @_debug
      console.log "StorageHandler.applyFilters:"
      console.log "filter for type (#{@metadataHandler.getTarget().objectType}): #{@_filterForResourceType}, user: #{@_filterForUser}, appId: #{@_filterForAppId}, provider: #{@_filterForProvider}"
      console.log metadatas
    # it's important to filter provider before user, since the userId contains the providerId, and therefore we then filter for user displayName
    if @_filterForResourceType
      metadatas = metadatas.filter (entry) => entry.metadata.target.objectType is @metadataHandler.getTarget().objectType
    if @_filterForProvider
      metadatas = metadatas.filter (entry) => entry.metadata.provider.id is @metadataHandler.getProvider().id
    if @_filterForUser
      if @metadataHandler.getMetadata().contextualActor?
        # there is a contextualActor available, so filter for this user (instead of actor)
        metadatas = metadatas.filter (entry) => entry.metadata.actor.displayName is @metadataHandler.getMetadata().contextualActor.displayName
      else
        metadatas = metadatas.filter (entry) => entry.metadata.actor.displayName is @metadataHandler.getActor().displayName
    if @_filterForAppId
      metadatas = metadatas.filter (entry) => entry.metadata.generator.id is @metadataHandler.getGenerator().id
    if @_customFilter
      metadatas = metadatas.filter (entry) => @_customFilter(entry.metadata)
    if @_debug
      console.log "after: "
      console.log metadatas
    return metadatas

  # internal function, typically not used external
  getResourceBundle: (content, id = @generateUUID()) =>
    # cloning the objects!
    thisContent = JSON.parse(JSON.stringify(content))
    metadata = JSON.parse(JSON.stringify(@metadataHandler.getMetadata()))
    # if there is a contextualActor available, inject these properties into metadata.actor
    if metadata.contextualActor?
      metadata.actor = metadata.contextualActor
      metadata.contextualActor = undefined
    metadata.published = (new Date()).toISOString()
    metadata.id = id
    {
    metadata: metadata,
    content: thisContent
    }

  _findLatestResourceId: (objectType, metadatas) ->
    if (@_debug)
      console.log("_findLatestResourceId(#{objectType}, #{metadatas.length})")
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
          latestId = entry.metadata.id
    latestId

  readLatestResource: (objectType, cb) =>
    if @_debug then console.log "StorageHandler: searching for latest resource of type '#{objectType}'"
    # iterate through list of all available metadata
    @listResourceMetaDatas (error, metadatas) =>
      if error?
        setTimeout(->
          if @_debug then console.log "StorageHandler: an error occured: #{error}"
          cb(error, undefined)
        , 0)
      else
        if @_debug
          console.log "StorageHandler: found resources:"
          console.log metadatas
        latestDate = new Date(1970,0,1)
        latestId = undefined
        for entry in metadatas
          if objectType? and objectType isnt entry.metadata.target.objectType
            # skip entry if an objectType is given, but it doesn't match
            continue
          if entry.metadata.published?
            # search for the latest date
            date = new Date(entry.metadata.published)
            if date > latestDate
              latestDate = date
              latestId = entry.metadata.id
        if latestId?
          if @_debug then console.log "StorageHandler: now reading #{latestId}"
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
  This is an optional call, which is needed if you want to use the CachingStorageHandler.
  Calls back with all (relevant) resources to cache at the client side.
  This means all resources for the current user for all tools.
  If desired, the content part of the resources can be skipped.
  Takes a callback with (err, metadatas), where metadatas is an Array of
  { id, metadata: {} } objects. err is null or contains the error if any error
  occured. The metadatas are (potentially) filtered for username, resource type, and provider id.
###
#  listAllResourcesForCaching: (cb)->

###
  Implementation of an object storage handler
###
class window.golab.ils.storage.ObjectStorageHandler extends window.golab.ils.storage.StorageHandler
  constructor: (metadataHandler, storeObject) ->
    super
    if ( typeof storeObject != "object")
      throw "you must pass on an object to store the resources"
    @storeObject = storeObject
    if @_debug then console.log "Initializing ObjectStorageHandler."
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
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

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
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

    if @storeObject[resourceId]
      # create resource with id, metadata and content
      resource = @getResourceBundle(content, resourceId)
      @storeObject[resourceId] = resource
      if @_debug then console.log "MemoryStorage: updateResource #{resourceId}"
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
    @className = "golab.ils.storage.MemoryStorageHandler"
    if @_debug then console.log "Initializing MemoryStorageHandler, debug: #{@_debug}."
    @

###
  Implementation of a local (browser) storage handler.
###
#if false
#  # let intellij know that localStorage does exits
#  localStorage = localStorage || {}

goLabLocalStorageKey = "_goLab_"
class window.golab.ils.storage.LocalStorageHandler extends window.golab.ils.storage.StorageHandler
  constructor: (metadataHandler) ->
    super
    @className = "golab.ils.storage.LocalStorageHandler"
    if @_debug then console.log "Initializing LocalStorageHandler."
    @localStorage = window.localStorage
    @

  readResource: (resourceId, cb) ->
    if @localStorage[goLabLocalStorageKey + resourceId]
      if @_debug then console.log "LocalStorageHandler: readResource #{resourceId}"
      setTimeout(=>
        if (@_debug)
          console.log(@localStorage[goLabLocalStorageKey + resourceId])
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
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

    if @localStorage[goLabLocalStorageKey + resourceId]?
      delete @localStorage[goLabLocalStorageKey + resourceId]
      setTimeout(->
        cb null
      , 0)
    else
      setTimeout(->
        cb new Error "Can't delete resource - doesn't exist."
      , 0)

  createResource: (content, cb) =>
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

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
        if @_debug then console.log "LocalStorageHandler: resource created:"
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
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

    if @localStorage[goLabLocalStorageKey + resourceId]
      # create resource with id, metadata and content
      resource = @getResourceBundle(content, resourceId)
      @localStorage[goLabLocalStorageKey + resourceId] = JSON.stringify(resource)
      if @_debug then console.log "LocalStorageHandler: updateResource #{resourceId}"
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

  listAllResourcesForCaching: (cb) =>
    metadatas = []
    for id, resourceString of @localStorage when @isGoLabKey(id)
      resource = JSON.parse(resourceString)
      metadatas.push {
        id: resource.metadata.id
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
    @className = "golab.ils.storage.VaultStorageHandler"
    if @_debug then console.log "Initializing VaultStorageHandler."
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
      if @metadataHandler.getMetadata().target.objectType is "configuration"
        ils.getApp (app) =>
          if app.metadata? and app.metadata.settings?
            configuration = ils.getFixedConfiguration(app.id, app.displayName, app.appUrl, app.metadata.settings, "undefined", "undefined", "undefined");
          else
            configuration = undefined
          ut.commons.utils.decodeSpecialKeyCharsInJson(configuration)
          cb null, configuration
      else
        ils.readResource resourceId, (result) =>
          if result.error?
            cb result.error
          else
            if @_debug? then console.log "ils.readResource returns:"
            if @_debug? then console.log result
            resource = {}
            if typeof result.metadata is 'object'
              resource.metadata = result.metadata
            else
              try
                resource.metadata = JSON.parse(result.metadata)
              catch error
                console.warn "Could not parse metadata when reading a resource:"
                console.warn result.metadata
                cb error
                return
            resource.metadata.id = resourceId
            if typeof result.content is 'object'
              resource.content = result.content
            else
              try
                resource.content = JSON.parse(result.content)
              catch error
                console.warn "Could not parse content when reading a resource:"
                console.warn result.content
                cb error
                return
              # update the metadata with new properties
            @metadataHandler.setId resource.metadata.id
            @metadataHandler.setTarget(resource.metadata.target)
            ut.commons.utils.decodeSpecialKeyCharsInJson(resource.content)
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

  setConfiguration: (content, cb) =>
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot set configuration.")
      , 0)
      return

    try
      resource = @getResourceBundle(content)
      @metadataHandler.setId resource.metadata.id
      if @_debug? then console.log "Setting configuration resource in Vault:"
      if @_debug? then console.log resource
      ils.setAppConfiguration resource.content, resource.metadata, (result) =>
        if @_debug? then console.log "ils.createConfigurationFile returns:"
        if result.error?
          if @_debug? then console.log result.error
          cb result.error
        else
          if @_debug? then console.log result
          cb null, resource
    catch
      console.warn "Something went wrong when trying to create a configuration in the vault:"
      console.warn error
      cb error

  createResource: (content, cb) =>
    ut.commons.utils.encodeSpecialKeyCharsInJson(content)
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

    # this function relays the call to the ILS library,
    # maps is correctly to the callback parameters
    # and does some additional error catching
    if @_debug? then console.log "VaultStorageHandler.createResource called."
    if @_debug? then console.log "... for type: #{@metadataHandler.getMetadata().target.objectType}"
    if @metadataHandler.getMetadata().target.objectType is "configuration"
      @setConfiguration content, cb
    else
      # handle creating a new standard resource (no configuration)
      try
        console.log "Creating a new standard resource in Vault."
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
            if typeof result.metadata is 'object'
              returnedResource.metadata = result.metadata
            else
              try
                returnedResource.metadata = JSON.parse(result.metadata)
              catch error
                console.warn "Something went wrong when trying to parse the returned resource's metadata:"
                console.warn resource.metadata
                cb error
                return
            # the id might have change here. update in metadata handler
            returnedResource.metadata.id = result.id
            @metadataHandler.setId returnedResource.id
            ut.commons.utils.decodeSpecialKeyCharsInJson(returnedResource.content)
            cb null, returnedResource
      catch error
        console.warn "Something went wrong when trying to create a resource in the vault:"
        console.warn error
        cb error

  updateResource: (resourceId, content, cb) ->
    ut.commons.utils.encodeSpecialKeyCharsInJson(content)
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

    # this function relays the call to the ILS library,
    # maps is correctly to the callback parameters
    # and does some additional error catching
    if @_debug? then console.log "VaultStorageHandler.updateResource called."
    if @_debug? then console.log "... for type: #{@metadataHandler.getMetadata().target.objectType}"
    if @metadataHandler.getMetadata().target.objectType is "configuration"
      @setConfiguration content, cb
    else
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
            if (typeof result.metadata) is 'object'
              updatedResource.metadata = result.metadata
            else
              try
                updatedResource.metadata = JSON.parse(result.metadata)
              catch error
                console.error "Something went wrong when trying to parse the returned resource's metadata:"
                console.error result.metadata
                cb error
            # the id might have change here. update in metadata handler
            @metadataHandler.setId updatedResource.metadata.id
            ut.commons.utils.decodeSpecialKeyCharsInJson(updatedResource.content)
            cb null, updatedResource
      catch error
        console.warn "Something went wrong when trying to update resource #{resourceId} in the vault:"
        console.warn error
        cb error

  deleteResource: (resourceId, cb) ->
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

    # with the new configuration storage, I need to fetch the resource (to know metadata) before I can delete it
    @readResource resourceId, (error, resource) =>
      if error? or resource is ""
        console.warn "Could not delete resource #{resourceId}, because I couldn't load it to fetch its details."
        cb "Could not delete resource #{resourceId}, because I couldn't load it to fetch its details."
      else if resource.metadata.target.objectType is "configuration"
        console.warn "Cannot delete the configuration for appId #{resource.metadata.generator.id}, feature not implemented."
        # TODO delete the configuration
      else
        console.log "deleting a 'normal' resource."
        try
          ils.deleteResource resourceId, (result) =>
            if @_debug? then console.log "ils.deleteResource returns:"
            if @_debug? then console.log result
            if result.error?
              cb result.error
            else
              cb null
        catch error
          console.warn "Something went wrong when trying to delete resource #{resourceId} in the vault:"
          console.warn error
          cb error

  listResourceIds: (cb) ->
    throw "Not yet implemented."

  _listResourceMetaDatas: (forCaching, cb) ->
    # this function relays the call to the ILS library,
    # maps is correctly to the callback parameters
    # and does some additional error catching
    if @metadataHandler.getMetadata().target.objectType is "configuration"
      ils.getApp (app) =>
        returnedMetadatas = []
        if app.metadata? and app.metadata.settings?
          configuration = ils.getFixedConfiguration(app.id, app.displayName, app.appUrl, app.metadata.settings, "undefined", "undefined", "undefined");
          returnedMetadatas.push configuration
        cb null, returnedMetadatas
    else
      try
        filter = {}
        filter.vaultId = @metadataHandler.getMetadata().storageId
        if @_filterForUser
          if @metadataHandler.getMetadata().contextualActor?
            filter.userId = @metadataHandler.getMetadata().contextualActor.id
          else
            filter.userId = @metadataHandler.getMetadata().actor.id
        else
          filter.userId = ""
        if @_filterForAppId and not forCaching
          filter.appId = @metadataHandler.getMetadata().generator.id
        else
          filter.appId = ""
        if @_filterForResourceType and not forCaching
          filter.objectType = @metadataHandler.getMetadata().target.objectType
        else
          filter.objectType = ""
        filter.creationDateFrom = ""
        filter.creationDateTo = ""
        filter.lastModificationDateFrom = ""
        filter.lastModificationDateTo = ""
        ils.filterVault filter.vaultId, filter.userId, filter.appId, filter.objectType, filter.creationDateFrom, filter.creationDateTo, filter.lastModificationDateFrom, filter.lastModificationDateTo, (result) =>
          if @_debug then console.log "ils.filterVault returns:"
          if @_debug then console.log result
          if result.error?
            if result.error is "No resource available in the Vault."
              cb null, []
            else
              cb result.error
          else
            returnedMetadatas = []
            for resource in result
# do a quick sanity check:
              try
                item = {}
                if (resource.metadata)
                  item.id = resource.id
                  # check if resource.metadata is already an object
                  # if yes, use it, if not, parse it
                  if typeof resource.metadata is 'object'
                    item.metadata = resource.metadata
                  else
                    item.metadata = JSON.parse(resource.metadata)
                  if item.metadata? and item.metadata.target?
# to prevent potential inconsistencies:
                    item.metadata.id = resource.id
                    if (forCaching && resource.content)
                      item.content = JSON.parse(resource.content)
                    returnedMetadatas.push item
              catch error
                console.log "caught an error when parsing metadata from Vault"
                console.log error
            if (!forCaching)
              returnedMetadatas = @applyFilters(returnedMetadatas)
            cb null, returnedMetadatas
      catch error
        console.warn "Something went wrong when trying to list the resources in the vault:"
        console.warn error
        cb error

  listResourceMetaDatas: (cb) ->
    @_listResourceMetaDatas(false, cb)

  listAllResourcesForCaching: (cb) ->
    @_listResourceMetaDatas(true, cb)

###
  Implementation of a MongoDB storage handler.
###
class window.golab.ils.storage.MongoStorageHandler extends window.golab.ils.storage.StorageHandler
  constructor: (metadataHandler, @urlPrefix) ->
    super metadataHandler, true, true, true
    @className = "golab.ils.storage.MongoStorageHandler"
    if @urlPrefix?
      if @_debug then console.log "Initializing MongoStorageHandler."
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
          if @_debug
            console.log("GET readResource success, response:")
            console.log resource
          ut.commons.utils.decodeSpecialKeyCharsInJson(resource.content)
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
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

    try
      $.ajax({
        type: "POST",
        url: "#{@urlPrefix}/deleteResource/"+resourceId,
        crossDomain: true,
        success: (response) ->
          if @_debug
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
          if @_debug
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
    ut.commons.utils.encodeSpecialKeyCharsInJson(content)
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

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
          if @_debug
            console.log("POST createResource success, response:")
            console.log responseData
          # remove that mongo-internal id again
          delete resource._id
          ut.commons.utils.decodeSpecialKeyCharsInJson(resource.content)
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
    ut.commons.utils.encodeSpecialKeyCharsInJson(content)
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

    try
    # creating a resource with a given id
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
          if @_debug
            console.log("POST updateResource success, response:")
            console.log responseData
          delete resource._id
          ut.commons.utils.decodeSpecialKeyCharsInJson(resource.content)
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
          if @_debug
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
    @className = "golab.ils.storage.MongoIISStorageHandler"
    if @urlPrefix?
      if @_debug then console.log "Initializing MongoStorageHandler."
      @
    else
      console.error "I need an urlPrefix as second parameter."

  createResource: (content, cb) =>
    ut.commons.utils.encodeSpecialKeyCharsInJson(content)
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

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
          if @_debug
            console.log("POST createResource success, response:")
            console.log responseData
          # remove that mongo-internal id again
          delete resource._id
          ut.commons.utils.decodeSpecialKeyCharsInJson(resource.content)
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

  updateResource: (resourceId, content, cb, async = true) ->
    ut.commons.utils.encodeSpecialKeyCharsInJson(content)
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return

    try
    # creating a resource with a give id
      resource = @getResourceBundle(content, resourceId)
      # adding the mongo specific id
      resource._id = resource.metadata.id
      $.ajax({
        async: async
        type: "POST",
        url: "#{@urlPrefix}/updateResource.js",
        data: JSON.stringify(resource),
      #contentType: "application/json",
        crossDomain: true,
        success: (responseData, textStatus, jqXHR) ->
          if @_debug
            console.log("POST updateResource success, response:")
            console.log responseData
            console.log textStatus
            console.log jqXHR
          delete resource._id
          ut.commons.utils.decodeSpecialKeyCharsInJson(resource.content)
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

  _listResourceMetaDatas: (filterString, applyLocalFilters, cb) =>
    try
      urlString = "/listMetadatas.js"
      if filterString?
        urlString = urlString + "?" + filterString
      $.ajax({
        type: "GET",
        crossDomain: true
        contentType: "text/plain"
        url: @urlPrefix+urlString
        success: (responseData) =>
          if @_debug
            console.log("GET listResourceMetaDatas success, response (before filters):")
            console.log responseData
          metadatas = if (applyLocalFilters)
            @applyFilters(responseData)
          else
            responseData
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

  listResourceMetaDatas: (cb) =>
    filterString = ""
    if @_filterForProvider then filterString = "providerId=#{@metadataHandler.getProvider().id}"
    if @_filterForUser
      if filterString?
        filterString = filterString+"&"
      filterString = filterString + "actorId=#{@metadataHandler.getActor().id}"
    @_listResourceMetaDatas(filterString, true, cb)

  listAllResourcesForCaching: (cb) =>
    filterString = ""
    if @_filterForProvider then filterString = "providerId=#{@metadataHandler.getProvider().id}"
    @_listResourceMetaDatas(filterString, false, cb)

  readResource: (resourceId, cb) ->
    try
      $.ajax({
        type: "GET",
        url: "#{@urlPrefix}/readResource.js?id="+resourceId,
        crossDomain: true,
        success: (resource) ->
          if @_debug
            console.log("GET readResource success, response:")
            console.log resource
          delete resource._id
          ut.commons.utils.decodeSpecialKeyCharsInJson(resource.content)
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
    if @isReadOnly()
      setTimeout(->
        cb("StorageHandler is readOnly, cannot create resource.")
      , 0)
      return
      
    try
      $.ajax({
        type: "POST",
        url: "#{@urlPrefix}/deleteResource.js?id="+resourceId,
        crossDomain: true,
        success: (response) ->
          if @_debug
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
          if @_debug
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

window.golab.ils.storage.utils = window.golab.ils.storage.utils || {}

class ErrorHandler
  constructor: (@errors, @languageHandler, @logError)->

  reportError: (displayMessage, consoleMessage)->
    if (!consoleMessage)
      consoleMessage = displayMessage
    if (@logError)
      console.error(consoleMessage)
    @errors.push({
      display: displayMessage
      message: consoleMessage
    })

  reportErrorKey: (key, parameters...)->
    errorMessage = if (@languageHandler)
      @languageHandler.getMessage(key, parameters...)
    else
      key
    @reportError(errorMessage)


window.golab.ils.storage.utils.validateResourceJson = (resourceJson, languageHandler = null, logErrors = true, errors = [])->
  errorHandler = new ErrorHandler(errors, languageHandler, logErrors)
  if (typeof resourceJson != "object")
    errorHandler.reportErrorKey("resourceJson.failure.noObject")
  if (!resourceJson.metadata)
    errorHandler.reportErrorKey("resourceJson.failure.noMetadata")
  if (!resourceJson.content)
    errorHandler.reportErrorKey("resourceJson.failure.noContent")
  errors

window.golab.ils.storage.utils.validateResourceJsonArray = (resourceJsonArray, languageHandler = null, logErrors = true, errors = [])->
  errorHandler = new ErrorHandler(errors, languageHandler, logErrors)
  if (!Array.isArray(resourceJsonArray))
    errorHandler.reportErrorKey("resourceJson.failure.noArray")
  else
    for resourceJson in resourceJsonArray
      window.golab.ils.storage.utils.validateResourceJson(resourceJson, languageHandler, logErrors, errors)
  errors

window.golab.ils.storage.utils.importResourceJson = (storageHandler, resourceJson, languageHandler, callback)->
  originalMetadataString = JSON.stringify(storageHandler.getMetadataHandler().getMetadata())
  resourceTitle = ""
  if (resourceJson && resourceJson.metadata.target && resourceJson.metadata.target.displayName)
    resourceTitle = resourceJson.metadata.target.displayName
  storageHandler.getMetadataHandler().setMetadata(resourceJson.metadata)
  try
    storageHandler.createResource(resourceJson.content, (error, resource)->
      try
        storageHandler.getMetadataHandler().setMetadata(JSON.parse(originalMetadataString))
        if (error)
          callback({
            display: languageHandler.getMessage("resourceImport.failure.createResource", resourceTitle, error),
            message: "Failed to create resource (name=#{resourceTitle}): #{JSON.stringify(error)}"
          })
        else
          callback(null, resource.metadata.id)
      catch unexpectedError
        callback({
          display: languageHandler.getMessage("resourceImport.failure.createResource.inCallback.unexpected", resourceTitle, unexpectedError),
          message: "Unexpected error in callback of create resource (name=#{resourceTitle}): #{JSON.stringify(unexpectedError)}"
        })
    )
  catch error
    storageHandler.getMetadataHandler().setMetadata(JSON.parse(originalMetadataString))
    callback({
      display:languageHandler.getMessage("resourceImport.failure.createResource.unexpected", resourceTitle, error),
      message: "Unexpected error during resource import (name=#{resourceTitle}): #{JSON.stringify(error)}"
    })

window.golab.ils.storage.utils.importResourceJsonArray = (storageHandler, resourceJsonArray, overwrite, languageHandler, callback)->
  errors = []
  loadedResourceIds = []
  allTargetIds = {}
  getTargetId = (resourceJson)->
    if (resourceJson.metadata.target && resourceJson.metadata.target.id)
      resourceJson.metadata.target.id
    else
      null

  setAllTargetIds = (allMetadatas) ->
    for metadata in allMetadatas
      targetId = getTargetId(metadata)
      if (targetId)
        allTargetIds[targetId] = metadata

  getExistingResourceMetadata = (resourceJson)->
    targetId = getTargetId(resourceJson)
    if (targetId)
      allTargetIds[targetId]
    else
      null

  jsonArray = resourceJsonArray
  finishedLoading = ->
    callback(errors, loadedResourceIds)

  importNextResource = ->
    if (jsonArray.length)
      resourceJson = jsonArray.pop()
      existingResourceMetadata = getExistingResourceMetadata(resourceJson)
      if (!existingResourceMetadata || overwrite)
        importResource = ->
          window.golab.ils.storage.utils.importResourceJson(storageHandler, resourceJson, languageHandler, (error, resourceId)->
            if (error)
              errors.push(error)
            else
              loadedResourceIds.push(resourceId)
            importNextResource()
          )
        if (existingResourceMetadata)
          storageHandler.deleteResource(existingResourceMetadata.metadata.id, (error)->
            if (error)
              resourceTitle = ""
              if (resourceJson && resourceJson.metadata.target && resourceJson.metadata.target.displayName)
                resourceTitle = resourceJson.metadata.target.displayName
              errors.push({
                display: languageHandler.getMessage("resourceImport.failure.deleteResource", resourceTitle, error),
                message: "Failed to delete resource (name=#{resourceTitle}): #{JSON.stringify(error)}"
              })
              importNextResource()
            else
              importResource()
          )
        else
          importResource()
      else
        importNextResource()
    else
      finishedLoading()

  currentForResourceTypeFilter = storageHandler.getForResourceTypeFilter()
  currentForProviderFilter = storageHandler.getForProviderFilter()
  storageHandler.setForResourceTypeFilter(false)
  storageHandler.setForProviderFilter(false)
  try
    storageHandler.listResourceMetaDatas((error, metadatas)->
      storageHandler.setForResourceTypeFilter(currentForResourceTypeFilter)
      storageHandler.setForProviderFilter(currentForProviderFilter)
      if (error)
        errors.push({
          display:languageHandler.getMessage("resourceImport.failure.listResourceMetaDatas", error),
          message: "Failed to load list of resource metadatas: #{JSON.stringify(error)}"
        })
        finishedLoading()
      else
        setAllTargetIds(metadatas)
        importNextResource()
    )
  catch exception
    storageHandler.setForResourceTypeFilter(currentForResourceTypeFilter)
    errors.push({
      display:languageHandler.getMessage("resourceImport.failure.listResourceMetaDatas.unexpected", exception),
      message: "Unexpected error during load list of resource metadatas: #{JSON.stringify(exception)}"
    })
    finishedLoading()

window.golab.ils.storage.utils.importFromUrl = (storageHandler, url, overwrite, languageHandler, callback) ->
  try
    $.ajax({
      async: true
      type: "GET",
      url: url,
      crossDomain: true,
      success: (responseData, textStatus, jqXHR) ->
        resourceJsonArray = responseData
        validationsErrors = window.golab.ils.storage.utils.validateResourceJsonArray(resourceJsonArray, languageHandler)
        if (validationsErrors.length==0)
          window.golab.ils.storage.utils.importResourceJsonArray(storageHandler, resourceJsonArray, overwrite, languageHandler, callback)
        else
          callback(validationsErrors, [])
      error: (responseData, textStatus, errorThrown) ->
        callback([{
          display: languageHandler.getMessage("resourceImport.failure.loadJson", url, errorThrown),
          message: "Failed to load json from #{url}: #{JSON.stringify(errorThrown)}"
        }])
    })
  catch error
    callback([{
      display: languageHandler.getMessage("resourceImport.failure.loadJson.unexpected", url, error),
      message: "Unexpected error during load json from #{url}: #{JSON.stringify(error)}"
    }])

window.golab.ils.storage.utils.simpleImportFromUrl = (storageHandler, url, overwrite, languageHandler, callback) ->
  window.golab.ils.storage.utils.importFromUrl(storageHandler, url, overwrite, languageHandler, (errors, loadedResourceIds)->
    for error in errors
      console.error(error.message)
    if (loadedResourceIds)
      console.log("loaded #{loadedResourceIds.length} resources")
    callback()
  )

window.golab.ils.storage.utils.loadPreviewResources = (metadataHandler, storageHandler, languageHandler, previewResourcesUrl,
                                                       callback, loadResources = true)->
  if (loadResources && metadataHandler.getContext() == window.golab.ils.context.preview)
    window.golab.ils.storage.utils.simpleImportFromUrl(storageHandler, previewResourcesUrl, false, languageHandler,
      callback)
  else
    callback()
