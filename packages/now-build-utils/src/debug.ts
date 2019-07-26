export default function debug(message: string, additional?: object | string[]) {
  if (process.env.NOW_BUILDER_DEBUG) {
    console.log(message, additional);
  } else if (process.env.NOW_BUILDER_ANNOTATE) {
    console.log(`[now-builder-debug] ${message}`);
  }
}
