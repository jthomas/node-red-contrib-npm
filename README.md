# node-red-contrib-npm

Node-RED node allowing NPM modules to be dynamically exposed as custom nodes.

### Install

From your Node-RED directory:

    npm install node-red-contrib-npm
    
### Usage

Open the Editor panel to configure the NPM module to expose. NPM module name
must the package identifier in the [NPM registry](https://www.npmjs.com/). When
the flow is deployed, the package will be automatically downloaded and
installed. Status information will show you when the node is ready to receive
messages.

Using the editor panel, the node can be configured to execute
the module constructor, function property or a custom setup code when
receiving messages. The *msg.payload* property from incoming messages will be 
passed in as the sole argument to the function.

Results from the function execution will be set as *msg.payload*. The node
currently supports passing results from following function invocation patterns.

* Function Returns Primitive Type (String, Boolean, Array). 
* Function Returns Promise. 
* Results passed through a Callback.

For Promise or Callback results, messages will be sent when the results 
are available.
