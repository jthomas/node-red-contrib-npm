var npm = require('npm')
var vm = require("vm")
var temp = require("temp").track()
var temp_dir = temp.mkdirSync()
var temp_node_modules_path = temp_dir + '/node_modules/'

module.exports = function (RED) {
  var installed_modules = {}

  function NPM (config) {
    RED.nodes.createNode(this, config)
    var node = this
    var npm_module = null

    if (config.npm_module) {
      if (installed_modules[config.npm_module]) {
        npm_module = require(temp_node_modules_path + config.npm_module)
      } else {
        node.status({fill:"blue",shape:"dot",text:"installing"});
        npm.load({prefix: temp_dir, progress: false, loglevel: 'silent'}, function (er) {
          if (er) return node.error(er);

          npm.commands.install([config.npm_module], function (er, data) {
            if (er) {
              node.status({fill:"red",shape:"dot",text:"failed"});
              return node.error(er)
            }

            try {
              npm_module = require(temp_node_modules_path + config.npm_module)
              node.status({fill:"green",shape:"dot",text:"ready"});
              setTimeout(node.status.bind(node, {}), 2000)
              node.log('Downloaded and installed NPM module: ' + config.npm_module)
              installed_modules[config.npm_module] = true
            } catch (err) {
              node.error(err)
              node.status({fill:"red",shape:"dot",text:"failed"});
            }
          })
        })
      }
    }

    function execute_custom_module (msg) {
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
      return context.results;
    }

    function is_promise_result (result) {
      return (typeof result.then === 'function' && 
        typeof result.catch === 'function')
    }

    function handle_promise_result (promise, msg) {
      var send_message = function (result) {
        msg.payload = result
        node.send(msg)
      }

      var handle_error = function (err) {
        node.error(err, msg)
      }

      promise.then(send_message).catch(handle_error)
    }

    function convert_callback_to_promise (func, check_err) {
      return function (payload) {
        return new Promise(function (resolve, reject) {
          func(payload, function () {
            var err = check_err ? arguments[0]: null,
              result = check_err ? arguments[1] : arguments[0]

            if (err) {
              reject(err)
              return
            }

            resolve(result)
          })
        })
      }
    }

    this.on('input', function (msg) {
      if (!npm_module) {
        return node.error('NPM module did not install successfully. Check the name?', msg)
      }

      var result = null

      if (config.module_style === 'custom') {
        result = execute_custom_module(msg)
      } else {
        var module_func = npm_module

        if (config.module_style === 'function') {
          module_func = npm_module[config.function_name].bind(npm_module)
        }

        if (config.msg_payload !== 'return_val') {
          module_func = convert_callback_to_promise(module_func, config.msg_payload === 'callback_error')
        }

        result = module_func(msg.payload)
      } 

     if (is_promise_result(result)) {
       handle_promise_result(result, msg)
       return
     }

     msg.payload = result
     node.send(msg)
    })
  }
  RED.nodes.registerType('npm', NPM)
}
