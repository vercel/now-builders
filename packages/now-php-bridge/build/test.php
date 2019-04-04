<?php
mysqli_connect();
print('php_sapi_name=' . php_sapi_name() . PHP_EOL);
print('opcache_enabled=' . opcache_get_status()['opcache_enabled'] . PHP_EOL);
print('simplexml_loaded=' . extension_loaded('simplexml') . PHP_EOL);
print('xmlwriter_loaded=' . extension_loaded('xmlwriter') . PHP_EOL);
