package main

import (
	"net/http"
	now "github.com/zeit/now-builders/utils/go/bridge"
)

func main() {
	__ORIGINAL_MAIN_CALL
	now.Start(http.HandlerFunc(__NOW_HANDLER_FUNC_NAME))
}
