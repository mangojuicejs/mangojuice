import DefaultLogger from "./DefaultLogger";
import { extend } from '../core/utils';


/**
 * Simple console logger with stack support
 */
function SimpleStackLogger(name, model) {
  this.name = name || 'app';
  this.model = model;
  this.stack = [];
  this.cmdMap = {};
  this.levelText = "";
}

extend(SimpleStackLogger.prototype, DefaultLogger.prototype);
extend(SimpleStackLogger.prototype, {
  onStartExec(cmd) {
    if (!cmd.isHandler) {
      this.log(cmd.name, cmd.args);
    }
    this.stack.push(cmd);
    this.cmdMap[cmd.id] = cmd;
    this.levelText += "-";
  },

  onEndExec(cmd) {
    this.stack.pop(cmd);
    delete this.cmdMap[cmd.id];
    this.levelText = this.levelText.substr(0, this.levelText.length - 1);
  },

  log(text, ...args) {
    const levelDisplay = this.levelText ? ` ${this.levelText} ` : " ";
    console.log(`[${this.name}]${levelDisplay}${text}`, ...args);
  }
});

export default SimpleStackLogger;
