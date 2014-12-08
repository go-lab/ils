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
      "inquiryPhase": "Orientation"
      "inquiryPhaseId": "543e7058ab0f540000e5821c"
      "inquiryPhaseName": "MyOrientation"
      "displayName": "name-of-ils"
    }
  }
###

### example ils and space data
old graasp
//////////
ils:
	description: ""
	displayName: "ILS test"
	id: "19122"
	metadata: null
	objectId: 19122
	parentId: 934
	parentType: "@person"
	profileUrl: "http://graasp.epfl.ch/#item=space_19122"
	spacetype: "ils"
	updated: "2014-10-16T11:33:33+02:00"
	visibilityLevel: "public"

phase:
	description: "<div id="hypo-graasp-ch" class="wiki_widget"><iframe name="9190" src="http://graasp.epfl.ch/sharedapp/fb3f1a00319782d2b306b7d3920dbc62c83ae21c" width="800" height="600"></iframe></div>
	"displayName: "MyOrientation"
	id: "19123"
  // metadata might be null if it's a manually added space
	metadata: "{"type":"Orientation"}"
	objectId: 19123
	parentId: 19122
	parentType: "@space"
	profileUrl: "http://graasp.epfl.ch/#item=space_19123"
	spacetype: "folder"
	updated: "2014-10-16T11:33:33+02:00"
	visibilityLevel: "public"


new graasp
//////////
ils:
	created: "2014-10-15T13:02:16.612Z"
	description: ""
	displayName: "test graasp-eu-library"
	id: "543e7058ab0f540000e58217"
	ilsRef: Object
		__v: 0
		_id: "543e70582e2c55fc49b62595"
		lang: "en"
		modified: "2014-10-15T13:02:16.680Z"
		spaceRef: "543e7058ab0f540000e58217"
		userRef: "5405e1e0da3a95cf9050e5f2"
  metadata: Object
		type: "ils"
	parentId: "5405e1ada5ecce255b4a7222"
	parentType: "@space"
	profileUrl: "http://graasp.eu/spaces/543e7058ab0f540000e58217"
	spaceType: "ils"
	updated: "2014-10-15T13:02:16.865Z"
	visibilityLevel: "public"

phase:
	created: "2014-10-15T13:02:16.678Z"
	description: "Welcome to the Orientation phase. You can describe here what students have to do in the Orientation phase."
	displayName: "MyOrientation"
	id: "543e7058ab0f540000e5821c"
	// metadata might be missing if it's a manually added phase space
  metadata:
		type: "Orientation"
	parentId: "543e7058ab0f540000e58217"
	parentType: "@space"
	profileUrl: "http://graasp.eu/spaces/543e7058ab0f540000e5821c"
	spaceType: "folder"
	updated: "2014-10-15T13:02:45.001Z"
	visibilityLevel: "public"
###

"use strict"

window.golab = window.golab || {}
window.golab.ils = window.golab.ils || {}
window.golab.ils.metadata = window.golab.ils.metadata || {}

window.golab.ils.context = window.golab.ils.context or {}
# the tool is running...
# ...inside Graasp / authoring mode
window.golab.ils.context.graasp = "graasp"
# ...in an ILS / student mode
window.golab.ils.context.ils = "ils"
# ...as a preview on golabz.eu
window.golab.ils.context.preview = "preview"
# ...directly rendered via shindig
window.golab.ils.context.direct = "direct"
# ...as a standalone HTML version
window.golab.ils.context.standalone = "standalone"
# ...in an unknown context
window.golab.ils.context.unknown = "unknown"

class window.golab.ils.metadata.MetadataHandler

  constructor: (metadata, cb) ->
    console.log("Initializing MetadataHandler.")
    # the context might already be set through subclass-constructors. if not, do it now.
    @_context = @_context or @identifyContext()
    if metadata
      # cloning the parameter to avoid side-effects
      @_metadata = JSON.parse(JSON.stringify(metadata))
    else
      throw "MetadataHandler needs an initial set of metadata at construction!"

    setTimeout(=>
      cb(null, @) if cb
    , 0)
    console.log "MetadataHandler construction for #{@_metadata.generator.displayName} complete. Using the following metadata:"
    console.log @_metadata
    console.log "context: #{@getContext()}"
    @

  identifyContext: () =>
    console.log "MetadataHandler.identifyContent. document.referrer:"
    console.log document.referrer
    if not osapi?
      @_context = window.golab.ils.context.standalone
    else if document.referrer.indexOf("ils_metawidget") isnt -1
      @_context = window.golab.ils.context.ils
    else if document.referrer.indexOf("graasp.eu") isnt -1
      @_context = window.golab.ils.context.graasp
    else if document.referrer.indexOf("golabz.eu") isnt -1
      @_context = window.golab.ils.context.preview
    else if document.referrer is ""
      @_context = window.golab.ils.context.direct
    else
      @_context = window.golab.ils.context.unknown

  getContext: () =>
    @_context

  setId: (newId) ->
    @_metadata.id = newId
    @

  getId: () ->
    @_metadata.id

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
    @identifyContext()
    if osapi?
      # we in an OpenSocial context, try to get information from there...
      try
        if not $.cookie
          throw "jquery.cookie library needs to be present before using the (GoLab)MetadataHandler (needed by ILS library)."
        if not ils
          throw "ILS library needs to be present before using the (GoLab)MetadataHandler."

        findUsername = $.Deferred()
        console.log "identified context:"
        console.log @getContext()
        if @getContext() is window.golab.ils.context.ils
          ils.getCurrentUser (userResult) =>
            if userResult.error
              console.warn "error reading username: #{userResult.error}"
              findUsername.resolve("unknown")
            else
              findUsername.resolve(userResult)
        else if @getContext() is window.golab.ils.context.graasp
          osapi.people.getOwner().execute (owner) ->
            findUsername.resolve(owner.displayName)
        else
          findUsername.resolve("unknown")

        findUsername.done (userName) =>
          metadata.actor.displayName = userName
          ils.getIls (ils, phase) =>
            console.log "GoLab-MetadataHandler: ilsSpace, phaseSpace:"
            console.log ils
            console.log phase
            # differentiate between situations:
            if ils.error?
              # we can't get any information from the ILS, probably we are running as a preview on golabz.eu
              console.log "MetadataHandler: golabz.eu preview."
              metadata.provider.objectType = "preview"
              metadata.provider.id = "undefined"
              metadata.provider.displayName = "undefined"
              metadata.provider.url = window.location.href
              metadata.generator.url = gadgets.util.getUrlParameters().url
              metadata.provider.inquiryPhase = "undefined"
              metadata.provider.inquiryPhaseId = "undefined"
              metadata.provider.inquiryPhaseName = "undefined"
            else if ils.objectId?
              # we have the old graasp
              metadata.provider.objectType = ils.spaceType
              metadata.provider.id = ils.id
              metadata.provider.displayName = ils.displayName
              metadata.provider.url = ils.profileUrl
              if phase? and phase.spaceType is "folder"
                # we have the old graasp and are in a phase space
                console.log "MetadataHandler: old Graasp, phase space."
                metadata.generator.url = gadgets.util.getUrlParameters().url
                if phase.metadata
                  metadata.provider.inquiryPhase = JSON.parse(phase.metadata).type
                else
                  metadata.provider.inquiryPhase = "unknown"
              else
                # we have the old graasp and are in an ILS space
                console.log "MetadataHandler: old Graasp, ILS space."
                metadata.provider.inquiryPhase = "ils"
                # in an ILS space, generator, and target share the provider properties
                metadata.generator = {}
                metadata.generator.objectType = metadata.provider.objectType
                metadata.generator.url = metadata.provider.url
                metadata.generator.id =  metadata.provider.id
                metadata.generator.displayName = metadata.provider.displayName
                # this is an initial value and will be overridden with the active phase information
                metadata.target = metadata.generator
            else
              # we have the new graasp
              metadata.provider.objectType = ils.spaceType
              metadata.provider.id = ils.id
              metadata.provider.displayName = ils.displayName
              metadata.provider.url = ils.profileUrl
              if phase? and phase.spaceType is "folder"
                # we have the new graasp and are in a phase space
                console.log "MetadataHandler: new Graasp, phase space."
                metadata.generator.url = gadgets.util.getUrlParameters().url
                metadata.provider.inquiryPhaseId = phase.id
                metadata.provider.inquiryPhaseName = phase.displayName
                if phase.metadata?
                  metadata.provider.inquiryPhase = phase.metadata.type
                else
                  metadata.provider.inquiryPhase = "unknown"
              else
                # we have the new graasp and are in an ILS space
                console.log "MetadataHandler: new Graasp, ILS space."
                metadata.provider.inquiryPhase = "ils"
                # in an ILS space, generator, and target share the provider properties
                metadata.generator = {}
                metadata.generator.objectType = metadata.provider.objectType
                metadata.generator.url = metadata.provider.url
                metadata.generator.id =  metadata.provider.id
                metadata.generator.displayName = metadata.provider.displayName
                # this is an initial value and will be overridden with the active phase information
                metadata.target = metadata.generator

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
    @identifyContext()
    getIdentifyingUrl = ->
      path = window.location.pathname
      subPaths = window.location.pathname.split("/")
      if (subPaths.length>1)
        switch subPaths[1].toLocaleLowerCase()
          when "production"
            path = subPaths[1]
          when "experiments"
            path = subPaths[1]
            if subPaths.length>2
              path += "/"+subPaths[2]
          else
            path = ""
      "#{window.location.protocol}//#{window.location.host}/#{path}".toLowerCase()

    # overriding some default values with the correct values for the "local" context
    metadata.provider.id = getIdentifyingUrl()
    # if present as URL, take from there
    if (@getParameterFromUrl("provider")?)
      metadata.provider.id = @getParameterFromUrl("provider")
    if document.title?
      metadata.provider.displayName = document.title
    else
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