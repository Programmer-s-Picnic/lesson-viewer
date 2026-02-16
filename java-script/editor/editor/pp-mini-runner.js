(function () {
  "use strict";

  function createWorkerURL() {
    var workerCode =
      '"use strict";\n' +
      "function send(type, payload){ postMessage(Object.assign({type:type}, payload||{})); }\n" +
      "function makeConsole(){\n" +
      "  function mk(level){\n" +
      "    return function(){\n" +
      "      var args = Array.prototype.slice.call(arguments);\n" +
      "      var safe = args.map(function(a){\n" +
      '        try { return typeof a === "string" ? a : JSON.stringify(a); }\n' +
      "        catch(e){ return String(a); }\n" +
      "      });\n" +
      '      send("log",{level:level,args:safe});\n' +
      "    };\n" +
      "  }\n" +
      '  return { log:mk("log"), info:mk("info"), warn:mk("warn"), error:mk("error") };\n' +
      "}\n" +
      "onmessage = function(ev){\n" +
      "  var msg = ev.data || {};\n" +
      '  if(msg.type !== "run") return;\n' +
      '  var code = String(msg.code || "");\n' +
      '  var stdin = String(msg.stdin || "");\n' +
      "  var consoleProxy = makeConsole();\n" +
      '  function input(){ return ""; }\n' +
      "  try {\n" +
      '    var fn = new Function("console","input","\\"use strict\\";\\n"+code);\n' +
      "    fn(consoleProxy, input);\n" +
      '    send("done",{ok:true});\n' +
      "  } catch(err){\n" +
      '    send("done",{ok:false,error:String(err)});\n' +
      "  }\n" +
      "};";

    var blob = new Blob([workerCode], { type: "text/javascript" });
    return URL.createObjectURL(blob);
  }

  function runUserCode(options) {
    var workerURL = createWorkerURL();
    var worker = new Worker(workerURL);

    var timeoutMs = options.timeoutMs || 2000;
    var onStdout = options.onStdout || function () {};
    var onStderr = options.onStderr || function () {};

    return new Promise(function (resolve) {
      var timer = setTimeout(function () {
        worker.terminate();
        resolve({ ok: false, timeout: true, error: "Timeout exceeded" });
      }, timeoutMs);

      worker.onmessage = function (ev) {
        var msg = ev.data || {};

        if (msg.type === "log") {
          var line = (msg.args || []).join(" ");
          if (msg.level === "error") {
            onStderr(line);
          } else {
            onStdout(line);
          }
          return;
        }

        if (msg.type === "done") {
          clearTimeout(timer);
          worker.terminate();
          resolve(msg);
        }
      };

      worker.postMessage({
        type: "run",
        code: options.code || "",
        stdin: options.stdin || "",
      });
    });
  }

  window.PP_MINI_RUNNER = {
    runUserCode: runUserCode,
  };
})();
