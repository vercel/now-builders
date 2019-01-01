FROM library/centos:7
RUN yum -y install wget git
RUN yum install -y yum-utils epel-release which
RUN yum -y install -y http://rpms.famillecollet.com/enterprise/remi-release-7.rpm
RUN yum --enablerepo=remi-safe -y install \
    php73 \
    php73-php-fpm \
    php73-php-opcache \
    php73-php-mysqli \
    php73-php-mbstring \
    php73-php-tokenizer

RUN yum -y install patchelf

RUN mkdir -p /root/app/public

WORKDIR /root/app
COPY ./php.ini /root/app/php.ini
COPY ./php-fpm.ini /root/app/php-fpm.ini
COPY ./test.php /root/app/test.php
COPY ./test.sh /root/app/test.sh

RUN patchelf --set-rpath '$ORIGIN' /usr/bin/php73
RUN patchelf --set-rpath '$ORIGIN' /opt/remi/php73/root/usr/sbin/php-fpm
RUN patchelf --set-rpath '$ORIGIN' /opt/remi/php73/root/usr/lib64/php/modules/mysqli.so
RUN patchelf --set-rpath '$ORIGIN' /opt/remi/php73/root/usr/lib64/php/modules/mysqlnd.so

CMD ["/bin/bash", "test.sh"]
