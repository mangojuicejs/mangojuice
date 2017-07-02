import DefaultLogger from "./DefaultLogger";

/**
 * Simple console logger with stack support
 */
export class SimpleStackLogger extends DefaultLogger {
  constructor(...args) {
    super(...args);
    this.stack = [];
    this.cmdMap = {};
    this.levelText = "";
  }

  onStartExec(cmd, model) {
    if (!cmd.isHandler) {
      this.log(cmd.name, cmd.args);
    }
    this.stack.push(cmd);
    this.cmdMap[cmd.id] = cmd;
    this.levelText += "-";
  }

  onEndExec(cmd, model) {
    this.stack.pop(cmd);
    delete this.cmdMap[cmd.id];
    this.levelText = this.levelText.substr(0, this.levelText.length - 1);
  }

  log(text, ...args) {
    const levelDisplay = this.levelText ? ` ${this.levelText} ` : " ";
    console.log(`[${this.name}]${levelDisplay}${text}`, ...args);
  }
}

export default SimpleStackLogger;
