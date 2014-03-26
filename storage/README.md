Go-Lab StorageHandler
=======

The StorageHandler provides a wrapper to access different storage implementation for client-side apps in Go-Lab. Currently, a MemoryStorageHandler (storing objects in memory) and a LocalStorageHandler (storing objects in the browser's local storage) are implemented.


Using the StorageHandler is closely connected to the MetadataHandler, which stores and gives access to information like username, object name and type, id of the current ILS etc., which is needed to the StorageHandler to create the object's metadata.

## Usage example (CoffeeScript):

(Please note: The MetadataHandler is filled manually with arbitrary data. This will be replaced with data from the ILS/Metawidget in future. Since the MetadataHandler is constructed asynchronally, we are using a callback to continue, here.)
<pre>
new window.golab.ils.metadata.GoLabMetadataHandler(
    {
      "actor": {
        "objectType": "person",
        "id": ut.commons.utils.generateUUID(),
        "displayName": "anonymized"
      },
      "target": {
        "objectType": "conceptMap",
        "id": ut.commons.utils.generateUUID(),
        "displayName": "unnamed concept map"
      },
      "generator": {
        "objectType": "application",
        "url": document.URL,
        "id": ut.commons.utils.generateUUID(),
        "displayName": "ut.tools.conceptmapper"
      },
      "provider": {
        "objectType": "ils",
        "url": "http://graasp.epfl.ch/metawidget/1/b387b6f...",
        "id": ut.commons.utils.generateUUID(),
        "displayName": "name-of-ils"
      }
    }, (error, metadataHandler) ->
      storageHandler = new window.golab.ils.storage.LocalStorageHandler(metadataHandler)
	  ...
	  storageHandler.createResource(jsonRepresentationOfObject, callback)
	  ...
	  storageHandler.listResourceMetaDatas(callback)
	  ...
	  storageHandler.readResource(resourceId, callback)
</pre>