export default function debug(message: string, additional?: object | string[]) {
  if (process.env.ENABLE_DEBUG_LOGS) {
    console.log(message, additional);
  } else if (process.env.ANNOTATE_DEBUG_LOGS) {
    console.log(`[builder-debug-log-line] ${message}`, additional);
  }
}
