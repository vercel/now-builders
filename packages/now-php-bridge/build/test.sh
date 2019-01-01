mkdir -p /root/app/modules
cp /usr/bin/php73 /root/app/php
cp /opt/remi/php73/root/usr/sbin/php-fpm /root/app/php-fpm
cp /opt/remi/php73/root/usr/lib64/php/modules/curl.so /root/app/modules/curl.so
cp /opt/remi/php73/root/usr/lib64/php/modules/json.so /root/app/modules/json.so
cp /opt/remi/php73/root/usr/lib64/php/modules/tokenizer.so /root/app/modules/tokenizer.so
cp /opt/remi/php73/root/usr/lib64/php/modules/mbstring.so /root/app/modules/mbstring.so
cp /opt/remi/php73/root/usr/lib64/php/modules/mysqli.so /root/app/modules/mysqli.so
cp /opt/remi/php73/root/usr/lib64/php/modules/mysqlnd.so /root/app/modules/mysqlnd.so
cp /opt/remi/php73/root/usr/lib64/php/modules/opcache.so /root/app/modules/opcache.so
rm -rf $(which php73)
rm -rf /opt/remi/php73/root/usr/sbin/php-fpm
rm -rf /opt/remi/php73/root/usr/lib64/php/
rm -rf /etc/opt/remi/php73/php.d
./php-fpm --help
./php -v
./php -m
./php -c php.ini test.php
echo "if you see 'can't connect to local mysql' - it is good - mysql library is found and used"
echo "if you see 'call to undefined function mysqli_connect' - it is bad - something went wrong"
