package main

import (
	now "../../utils/go/bridge"
	"net/http"
	__NOW_HANDLER_PACKAGE_NAME
)

func main() {
	now.Start(http.HandlerFunc(__NOW_HANDLER_FUNC_NAME))
}
