rm -rf ../dist
mkdir -p ../dist/modules
mkdir ./utils
cp ../../../utils/go/bridge/bridge.go ./utils/bridge.go
docker rmi now-wordpress-docker-image --force
docker build . -t now-wordpress-docker-image
docker run now-wordpress-docker-image
docker run now-wordpress-docker-image /bin/cat /root/go/app/launcher > ../dist/launcher
docker run now-wordpress-docker-image /bin/cat /root/go/app/php.ini > ../dist/php.ini
docker run now-wordpress-docker-image /bin/cat /usr/lib64/libphp7-7.1.so > ../dist/libphp7-7.1.so
docker run now-wordpress-docker-image /bin/cat /usr/lib64/php/modules/curl.so > ../dist/modules/curl.so
docker run now-wordpress-docker-image /bin/cat /usr/lib64/php/modules/json.so > ../dist/modules/json.so
docker run now-wordpress-docker-image /bin/cat /usr/lib64/php/modules/mbstring.so > ../dist/modules/mbstring.so
docker run now-wordpress-docker-image /bin/cat /usr/lib64/php/modules/mysqli.so > ../dist/modules/mysqli.so
docker run now-wordpress-docker-image /bin/cat /usr/lib64/mysql/libmysqlclient.so.16 > ../dist/modules/libmysqlclient.so.16
docker run now-wordpress-docker-image /bin/cat /usr/lib64/php/modules/opcache.so > ../dist/modules/opcache.so
chmod +x ../dist/launcher
rm -rf ./utils
