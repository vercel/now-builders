# PHP binaries.
cp /usr/bin/php /root/app/native/php
cp /usr/sbin/php-fpm /root/app/native/php-fpm

# PHP Modules.
cp -r /usr/lib64/php/modules /root/app/native/

# Shared lib missing on Linux's lambda.
cp /usr/lib64/mysql/libmysqlclient.so.16 /root/app/native/modules/libmysqlclient.so.16
cp /usr/lib64/libedit.so.0 /root/app/native/modules/libedit.so.0
cp /usr/lib64/libXpm.so.4 /root/app/native/modules/libXpm.so.4

patchelf --set-rpath '$ORIGIN:$ORIGIN/modules' /root/app/native/php
patchelf --set-rpath '$ORIGIN:$ORIGIN/modules' /root/app/native/php-fpm
patchelf --set-rpath '$ORIGIN:$ORIGIN/modules' /root/app/native/modules/mysqli.so
patchelf --set-rpath '$ORIGIN:$ORIGIN/modules' /root/app/native/modules/pdo_mysql.so
patchelf --set-rpath '$ORIGIN:$ORIGIN/modules' /root/app/native/modules/gd.so
patchelf --set-rpath '$ORIGIN:$ORIGIN/modules' /root/app/native/modules/xmlreader.so

# Simulates a clean environment.
rm -rf $(which php)
rm -rf $(which php-fpm)
rm -f /usr/lib64/libedit.so.0
rm -rf /usr/lib64/php
rm -rf /usr/lib64/mysql
rm -rf /etc/php.d

# Test binaries.
./native/php-fpm --help
./native/php -c ./native/php.ini test.php

echo "if you see 'can't connect to local mysql' - it is good - mysql library is found and used"
echo "if you see 'call to undefined function mysqli_connect' - it is bad - something went wrong"
