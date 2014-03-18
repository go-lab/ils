###
ILS Library for Go-Lab
###

# object that contains public functions
ils =
  getCurrentUser: (cb) ->
    username = $.cookie('user_name')
    this.getIls (ils) ->
      osapi.appdata.get({userId: prefixContextId,  keys: ["users"]}).execute (allUsers) ->
        userId = _.filter(allUsers, username)
        osapi.people.get({userId: userId}).execute (user) ->
          cb(user)

  getParent: (cb) ->
    osapi.context.get().execute (space) ->
      osapi.spaces.get({ contextId: space.id }).execute (parent) ->
        cb(parent)

  readVault: (docId, cb) ->
    # -1 will load document content as well
    # see: https://github.com/react-epfl/graasp/blob/master/app/controllers/assets_controller.rb#L321
    osapi.documents.get({contextId: docId, size: "-1"}).execute (document) ->
      cb(document)

  # Post object example: https://github.com/react-epfl/graasp/blob/master/app/controllers/assets_controller.rb#L236
  createVault: () ->

  listVault: (cb) ->
    # to implements get vault space function
    getVault (vault) ->
      osapi.documents.get({contextId: vault.id, contextType: "@space"}).execute (documents) ->
        cb(documents)

  # return: ILS in callback
  getIls: (cb) ->
    osapi.context.get().execute (space) ->
      osapi.spaces.get({ contextId: space.contextId }).execute (parentSpace) ->
        osapi.spaces.get({ contextId: parentSpace.parentId }).execute (parentIls) ->
          cb(parentIls)

  # return: Vault in callback
  getVault: (cb) ->
    ils.getIls (parentIls) ->
      console.log parentIls.id
      osapi.spaces.get({contextId: parentIls.id, contextType: "@space"}).execute (subspaces) ->
        vault = (item for item in subspaces.list when JSON.parse(item.metadata).type == "Vault")
        cb(vault[0])

  # return: phase in callback
  getParentInquiryPhase: (cb) ->
    this.getParent (parent) ->
      cb(parent.metadata.type)

  # return: phase in callback
  getParentInquiryPhase: (cb) ->
    osapi.context.get().execute (space) ->
      osapi.spaces.get({ contextId: space.id }).execute (parent) ->
        cb(parent.metadata.type)

  # return: action logger object
  getActionLogger: (metadataHandler, cb) ->
    cb(new ut.commons.actionlogging.ActionLogger(metaDataHandler))

  # return: notification client object
  getNotificationClient: (cb) ->
    osapi.context.get().execute(space) ->
      cb(new ude.commons.NotificationClient(space.id))

# attache ils to the window object
window.ils = ils
