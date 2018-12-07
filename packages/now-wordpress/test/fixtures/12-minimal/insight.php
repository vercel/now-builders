<?php
/**
 * @package WordPress
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __FILE__ ) . '/' );
}

require_once( ABSPATH . 'wp-config.php' );

header('Content-Type: text/plain');
print('HTTP_HOST: ' . $_SERVER['HTTP_HOST'] . PHP_EOL);
print('site_url: ' . site_url() . PHP_EOL);
print('home_url: ' . home_url() . PHP_EOL);
print('content_url: ' . content_url() . PHP_EOL);
print('WP_CONTENT_URL: ' . WP_CONTENT_URL . PHP_EOL);
