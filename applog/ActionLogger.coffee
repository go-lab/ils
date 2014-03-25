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
    console.log "ActionLogger: logging to go-lab.collide.info: #{activityStreamObject.verb} #{activityStreamObject.object.objectType}, id: #{activityStreamObject.object.id}"
    $.ajax({
      type: "POST",
      #url: "http://dufftown.inf.uni-due.de/activity",
      url: "http://go-lab.collide.info/activity",
      data: JSON.stringify(activityStreamObject),
      contentType: "application/json",
      success: (responseData, textStatus, jqXHR) ->
        console.log("POST actionlog success, response: #{responseData.statusText}")
      error: (responseData, textStatus, errorThrown) ->
        console.log("POST actionlog failed, response: #{responseData.statusText}")
    })