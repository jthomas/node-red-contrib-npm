var npm = require('npm')
var vm = require("vm")

module.exports = function (RED) {
  function NPM (config) {
    RED.nodes.createNode(this, config)
    var node = this
    var npm_module = null

    if (config.npm_module) {
      node.status({fill:"blue",shape:"dot",text:"installing"});
      npm.load({prefix: __dirname, progress: false, loglevel: 'silent'}, function (er) {
        if (er) return node.error(er);

        npm.commands.install([config.npm_module], function (er, data) {
          if (er) {
            node.status({fill:"red",shape:"dot",text:"failed"});
            return node.error(er)
          }

          try {
            npm_module = require(config.npm_module)
            node.status({fill:"green",shape:"dot",text:"ready"});
            setTimeout(node.status.bind(node, {}), 2000)
            node.log('Downloaded and installed NPM module: ' + config.npm_module)
          } catch (err) {
            node.error(err)
            node.status({fill:"red",shape:"dot",text:"failed"});
          }
        })
      })
    }

    this.on('input', function (msg) {
      if (!npm_module) {
        return node.error('NPM module did not install successfully. Check the name?', msg)
      }

      if (config.module_style === 'cstr') {
        msg.payload = npm_module(msg.payload) 
      } else if (config.module_style === 'function') {
        msg.payload = npm_module[config.function_name](msg.payload) 
      } else if (config.module_style === 'custom') {
        var sandbox = {
          context: {
            global:RED.settings.functionGlobalContext || {}
          },
          msg: msg,
          npm_module: npm_module
        }
        var functionText = 'var results = (function (msg) { ' + config.func + '})(msg);'
        var context = vm.createContext(sandbox);
        var script = vm.createScript(functionText);
        script.runInContext(context);
        msg.payload = context.results;
      }
      node.send(msg)
    })
  }
  RED.nodes.registerType('npm', NPM)
}
