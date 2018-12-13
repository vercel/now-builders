<?php

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __FILE__ ) . '/' );
}

define( 'WPINC', 'wp-includes' );
require( ABSPATH . 'wp-admin/includes/noop.php' );
require_once( ABSPATH . WPINC . '/wp-db.php' );

header('Content-Type: text/plain');

define( 'MYSQL_SSL_CA', ABSPATH . 'ca.pem' );
define( 'MYSQL_CLIENT_FLAGS', MYSQLI_CLIENT_SSL );

$dbuser     = $_ENV['DB_USER'];
$dbpassword = $_ENV['DB_PASSWORD'];
$dbname     = $_ENV['DB_NAME'];
$dbhost     = $_ENV['DB_HOST'];

$time1 = microtime(true);
$wpdb = new wpdb( $dbuser, $dbpassword, $dbname, $dbhost );
var_dump($wpdb);
$time2 = microtime(true);
print($time1 . PHP_EOL);
print($time2 . PHP_EOL);
print($time2 - $time1);
