"use strict"

window.ut ?= {}
window.ut.commons ?= {}
window.ut.commons.actionlogging = window.ut.commons.actionlogging|| {}

class window.ut.commons.actionlogging.ActionLogger

  constructor: (metadataHandler) ->
    console.log("Initializing ActionLogger.")
    console.log("...setting default logging target: nullLogging.")
    try
      metadataHandler.getMetadata()
      @metadataHandler = metadataHandler
    catch error
      throw "ActionLogger needs a MetadataHandler at construction!"
    # the defaults...
    @loggingTarget = @nullLogging

  setLoggingTarget: (newLoggingTarget) ->
    @loggingTarget = newLoggingTarget

  setLoggingTargetByName: (newLoggingTargetName) ->
    console.log "ActionLogger: setting logging target (by name) to #{newLoggingTargetName}"
    if newLoggingTargetName is "null" then @loggingTarget = @nullLogging
    else if newLoggingTargetName is "console" then @loggingTarget = @consoleLogging
    else if newLoggingTargetName is "consoleShort" then @loggingTarget = @consoleLoggingShort
    else if newLoggingTargetName is "dufftown" then @loggingTarget = @dufftownLogging
    else if newLoggingTargetName is "opensocial" then @loggingTarget = @opensocialLogging
    else
      console.log "ActionLogger: unknown logging target, setting to 'null'."
      @loggingTarget = @nullLogging

  log: (verb, object) =>
    # check if verb is accepted (see list of verbs at bottom of this class)
    verbAccepted = false
    for verbKey, verbValue of @verbs
      if verb is verbValue
        verbAccepted = true
    if not verbAccepted
      console.warn "ActionLogger: unknown verb: #{verb}"
    try
      # building ActivityStream object
      activityStreamObject = {}
      activityStreamObject.published = new Date().toISOString()
      activityStreamObject.actor = @metadataHandler.getActor()
      activityStreamObject.verb = verb
      activityStreamObject.object = object
      activityStreamObject.target = @metadataHandler.getTarget()
      activityStreamObject.generator = @metadataHandler.getGenerator()
      activityStreamObject.provider = @metadataHandler.getProvider()
      # ...and send it away
      @loggingTarget(activityStreamObject)
    catch error
      console.warn "something went wrong during logging:"
      console.warn error

  nullLogging: (action) ->
    return

  consoleLogging: (activityStreamObject) ->
    console.log JSON.stringify(activityStreamObject, undefined, 2)

  consoleLoggingShort: (activityStreamObject) ->
    console.log "ActionLogger: #{activityStreamObject.verb} #{activityStreamObject.object.objectType}, id: #{activityStreamObject.object.id}"

  opensocialLogging: (activityStreamObject) ->
    if osapi isnt undefined
      logObject = {
        "userId": "@viewer",
        "groupId": "@self",
        activity: activityStreamObject
      }
      console.log "ActionLogger: logging to Graasp: #{activityStreamObject.verb} #{activityStreamObject.object.objectType}, id: #{activityStreamObject.object.id}"
      osapi.activitystreams.create(logObject).execute (response) ->
        if response.id isnt undefined
          console.log "ActionLogger: sucessfully logged via osapi, response.id: #{response.id}"
        else
          console.log "ActionLogger: something went wrong when logging via osapi:"
          console.log response
    else
      console.log "ActionLogger: can't log, osapi is undefined."

  dufftownLogging: (activityStreamObject) ->
    #url = "http://130.89.159.190/activity"
    #url = "http://dufftown.inf.uni-due.de/activity"
    url = "http://go-lab.collide.info/activity"
    console.log "ActionLogger: logging to #{url}: #{activityStreamObject.verb} #{activityStreamObject.object.objectType}, id: #{activityStreamObject.object.id}"
    $.ajax({
      type: "POST",
      url: url,
      data: JSON.stringify(activityStreamObject),
      contentType: "application/json",
      success: (responseData, textStatus, jqXHR) ->
        console.log("POST actionlog success, response: #{responseData}")
      error: (responseData, textStatus, errorThrown) ->
        console.log "POST actionlog failed, response:"
        console.log responseData
    })

  verbs: {
    # used to indicate the start of a tool, lab, ils, etc.
    # the object specifies 'what' has been started
    # - in the case of a tool or lab, the object should contain metadata.generator
    # - in the case of an ILS, the object should contain metadata.provider
    application_started: "application_started"
    # proposal:
    # application_started: "access"
    access: "access"

    # used when a new artefact/document (e.g. a new concept map) is created
    # used in contrast to "add", when only a new part of a document is created (e.g. a concept)
    # the object should contain metadata.target (with a new id and displayName)
    create: "create"

    add: "add"
    update: "update"
    delete: "delete"

    # used to indicate that a resource has been retrieved,
    # e.g. a concept map has been loaded
    # the object should contain metadata.target
    load: "read"

    # used to indicate that a resource has been stored
    # the object should contain metadata.target
    save: "save"

    # indicates that the ILS phase has been changed
    # the object contains metadata.provider (with the new value of provider.inquiryPhase)
    phase_changed: "phase_changed"
    # proposal: use "access" here, too
  }