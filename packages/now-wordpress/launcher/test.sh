mkdir -p /root/go/app/modules
cp /usr/lib64/php/modules/curl.so /root/go/app/modules/curl.so
cp /usr/lib64/php/modules/json.so /root/go/app/modules/json.so
cp /usr/lib64/php/modules/mbstring.so /root/go/app/modules/mbstring.so
cp /usr/lib64/php/modules/mysqli.so /root/go/app/modules/mysqli.so
cp /usr/lib64/mysql/libmysqlclient.so.16 /root/go/app/modules/libmysqlclient.so.16
cp /usr/lib64/php/modules/opcache.so /root/go/app/modules/opcache.so
rm -rf /usr/lib64/php
rm -rf /usr/lib64/mysql
rm -rf /etc/php.d
php -c php.ini test.php
echo "if you see 'can't connect to local mysql' - it is good - mysql library is found and used"
echo "if you see 'call to undefined function mysqli_connect' - it is bad - something went wrong"
